import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolvePreferredBrikkoStudioTmpDir } from "../../../../infra/tmp-brikko-studio-dir.js";
import { listChannelPluginCatalogEntries } from "../../catalog.js";

function createCatalogEntry(params: {
  packageName: string;
  channelId: string;
  label: string;
  blurb: string;
  order?: number;
}) {
  return {
    name: params.packageName,
    brikko-studio: {
      channel: {
        id: params.channelId,
        label: params.label,
        selectionLabel: params.label,
        docsPath: `/channels/${params.channelId}`,
        blurb: params.blurb,
        ...(params.order === undefined ? {} : { order: params.order }),
      },
      install: {
        npmSpec: params.packageName,
      },
    },
  };
}

function writeCatalogFile(catalogPath: string, entry: Record<string, unknown>) {
  fs.writeFileSync(
    catalogPath,
    JSON.stringify({
      entries: [entry],
    }),
  );
}

function writeDiscoveredChannelPlugin(params: {
  stateDir: string;
  packageName: string;
  channelLabel: string;
  pluginId: string;
  blurb: string;
}) {
  const pluginDir = path.join(params.stateDir, "extensions", "demo-channel-plugin");
  fs.mkdirSync(pluginDir, { recursive: true });
  fs.writeFileSync(
    path.join(pluginDir, "package.json"),
    JSON.stringify({
      name: params.packageName,
      brikko-studio: {
        extensions: ["./index.js"],
        channel: {
          id: "demo-channel",
          label: params.channelLabel,
          selectionLabel: params.channelLabel,
          docsPath: "/channels/demo-channel",
          blurb: params.blurb,
        },
        install: {
          npmSpec: params.packageName,
        },
      },
    }),
    "utf8",
  );
  fs.writeFileSync(
    path.join(pluginDir, "brikko-studio.plugin.json"),
    JSON.stringify({
      id: params.pluginId,
      configSchema: {},
    }),
    "utf8",
  );
  fs.writeFileSync(path.join(pluginDir, "index.js"), "module.exports = {}", "utf8");
}

function expectCatalogIdsContain(params: {
  expectedId: string;
  catalogPaths?: string[];
  env?: NodeJS.ProcessEnv;
}) {
  const ids = listChannelPluginCatalogEntries({
    ...(params.catalogPaths ? { catalogPaths: params.catalogPaths } : {}),
    ...(params.env ? { env: params.env } : {}),
  }).map((entry) => entry.id);
  expect(ids).toContain(params.expectedId);
}

function findCatalogEntry(params: {
  channelId: string;
  catalogPaths?: string[];
  env?: NodeJS.ProcessEnv;
}) {
  return listChannelPluginCatalogEntries({
    ...(params.catalogPaths ? { catalogPaths: params.catalogPaths } : {}),
    ...(params.env ? { env: params.env } : {}),
  }).find((entry) => entry.id === params.channelId);
}

function expectCatalogEntryMatch(params: {
  channelId: string;
  expected: Record<string, unknown>;
  catalogPaths?: string[];
  env?: NodeJS.ProcessEnv;
}) {
  expect(
    findCatalogEntry({
      channelId: params.channelId,
      ...(params.catalogPaths ? { catalogPaths: params.catalogPaths } : {}),
      ...(params.env ? { env: params.env } : {}),
    }),
  ).toMatchObject(params.expected);
}

export function describeChannelPluginCatalogEntriesContract() {
  describe("channel plugin catalog entries contract", () => {
    it.each([
      {
        name: "includes external catalog entries",
        setup: () => {
          const dir = fs.mkdtempSync(
            path.join(resolvePreferredBrikkoStudioTmpDir(), "brikko-studio-catalog-"),
          );
          const catalogPath = path.join(dir, "catalog.json");
          writeCatalogFile(
            catalogPath,
            createCatalogEntry({
              packageName: "@brikko-studio/demo-channel",
              channelId: "demo-channel",
              label: "Demo Channel",
              blurb: "Demo entry",
              order: 999,
            }),
          );
          return {
            channelId: "demo-channel",
            catalogPaths: [catalogPath],
            expected: { id: "demo-channel" },
          };
        },
      },
      {
        name: "preserves plugin ids when they differ from channel ids",
        setup: () => {
          const stateDir = fs.mkdtempSync(
            path.join(resolvePreferredBrikkoStudioTmpDir(), "brikko-studio-channel-catalog-state-"),
          );
          writeDiscoveredChannelPlugin({
            stateDir,
            packageName: "@vendor/demo-channel-plugin",
            channelLabel: "Demo Channel",
            pluginId: "@vendor/demo-runtime",
            blurb: "Demo channel",
          });
          return {
            channelId: "demo-channel",
            env: {
              ...process.env,
              BRIKKO_STUDIO_STATE_DIR: stateDir,
              BRIKKO_STUDIO_BUNDLED_PLUGINS_DIR: "/nonexistent/bundled/plugins",
            },
            expected: { pluginId: "@vendor/demo-runtime" },
          };
        },
      },
      {
        name: "keeps discovered plugins ahead of external catalog overrides",
        setup: () => {
          const stateDir = fs.mkdtempSync(
            path.join(resolvePreferredBrikkoStudioTmpDir(), "brikko-studio-catalog-state-"),
          );
          const catalogPath = path.join(stateDir, "catalog.json");
          writeDiscoveredChannelPlugin({
            stateDir,
            packageName: "@vendor/demo-channel-plugin",
            channelLabel: "Demo Channel Runtime",
            pluginId: "@vendor/demo-channel-runtime",
            blurb: "discovered plugin",
          });
          writeCatalogFile(
            catalogPath,
            createCatalogEntry({
              packageName: "@vendor/demo-channel-catalog",
              channelId: "demo-channel",
              label: "Demo Channel Catalog",
              blurb: "external catalog",
            }),
          );
          return {
            channelId: "demo-channel",
            catalogPaths: [catalogPath],
            env: {
              ...process.env,
              BRIKKO_STUDIO_STATE_DIR: stateDir,
              CLAWDBOT_STATE_DIR: undefined,
              BRIKKO_STUDIO_BUNDLED_PLUGINS_DIR: "/nonexistent/bundled/plugins",
            },
            expected: {
              install: { npmSpec: "@vendor/demo-channel-plugin" },
              meta: { label: "Demo Channel Runtime" },
              pluginId: "@vendor/demo-channel-runtime",
            },
          };
        },
      },
      {
        name: "accepts rich external manifest entries with pinned npm metadata",
        setup: () => {
          const dir = fs.mkdtempSync(
            path.join(resolvePreferredBrikkoStudioTmpDir(), "brikko-studio-catalog-rich-"),
          );
          const catalogPath = path.join(dir, "catalog.json");
          fs.writeFileSync(
            catalogPath,
            JSON.stringify({
              $schema: "./manifest.schema.json",
              schemaVersion: 1,
              description:
                "Extension manifest. Declares plugin packages that BrikkoStudio can discover during onboarding and install on demand via `brikko-studio plugins install`.",
              entries: [
                {
                  name: "@wecom/wecom-brikko-studio-plugin",
                  description:
                    "BrikkoStudio WeCom (企业微信) channel plugin — community maintained, published on npm.",
                  source: "external",
                  kind: "channel",
                  brikko-studio: {
                    channel: {
                      id: "wecom",
                      label: "WeCom",
                      selectionLabel: "WeCom (企业微信)",
                      detailLabel: "WeCom",
                      docsPath: "/channels/wecom",
                      docsLabel: "wecom",
                      blurb: "企业微信 (WeCom) bot & conversation channel.",
                      aliases: ["qywx", "wework"],
                      order: 45,
                    },
                    install: {
                      npmSpec: "@wecom/wecom-brikko-studio-plugin@1.2.3",
                      defaultChoice: "npm",
                      minHostVersion: ">=2026.4.10",
                      expectedIntegrity: "sha512-wecom",
                    },
                  },
                },
              ],
            }),
          );
          return {
            channelId: "wecom",
            catalogPaths: [catalogPath],
            expected: {
              id: "wecom",
              meta: {
                label: "WeCom",
                selectionLabel: "WeCom (企业微信)",
                detailLabel: "WeCom",
                docsPath: "/channels/wecom",
                docsLabel: "wecom",
                blurb: "企业微信 (WeCom) bot & conversation channel.",
              },
              install: {
                npmSpec: "@wecom/wecom-brikko-studio-plugin@1.2.3",
                defaultChoice: "npm",
                minHostVersion: ">=2026.4.10",
                expectedIntegrity: "sha512-wecom",
              },
              installSource: {
                defaultChoice: "npm",
                npm: {
                  spec: "@wecom/wecom-brikko-studio-plugin@1.2.3",
                  packageName: "@wecom/wecom-brikko-studio-plugin",
                  selector: "1.2.3",
                  selectorKind: "exact-version",
                  exactVersion: true,
                  expectedIntegrity: "sha512-wecom",
                  pinState: "exact-with-integrity",
                },
                warnings: [],
              },
            },
          };
        },
      },
      {
        name: "pins bare external prerelease package specs to the entry version",
        setup: () => {
          const dir = fs.mkdtempSync(
            path.join(resolvePreferredBrikkoStudioTmpDir(), "brikko-studio-catalog-prerelease-"),
          );
          const catalogPath = path.join(dir, "catalog.json");
          writeCatalogFile(catalogPath, {
            ...createCatalogEntry({
              packageName: "@brikko-studio/prerelease-demo-channel",
              channelId: "prerelease-demo",
              label: "Prerelease Demo",
              blurb: "Prerelease package pinning fixture",
            }),
            version: "2026.5.3-beta.1",
          });
          return {
            channelId: "prerelease-demo",
            catalogPaths: [catalogPath],
            expected: {
              install: { npmSpec: "@brikko-studio/prerelease-demo-channel@2026.5.3-beta.1" },
              installSource: {
                npm: {
                  spec: "@brikko-studio/prerelease-demo-channel@2026.5.3-beta.1",
                  packageName: "@brikko-studio/prerelease-demo-channel",
                  selector: "2026.5.3-beta.1",
                  selectorKind: "exact-version",
                  exactVersion: true,
                },
              },
            },
          };
        },
      },
      {
        name: "accepts external manifest entries with ClawHub-only install metadata",
        setup: () => {
          const dir = fs.mkdtempSync(
            path.join(resolvePreferredBrikkoStudioTmpDir(), "brikko-studio-catalog-clawhub-"),
          );
          const catalogPath = path.join(dir, "catalog.json");
          fs.writeFileSync(
            catalogPath,
            JSON.stringify({
              $schema: "./manifest.schema.json",
              schemaVersion: 1,
              description:
                "Extension manifest. Declares plugin packages that BrikkoStudio can discover during onboarding and install on demand via `brikko-studio plugins install`.",
              entries: [
                {
                  source: "external",
                  kind: "channel",
                  brikko-studio: {
                    channel: {
                      id: "clawhub-chat",
                      label: "ClawHub Chat",
                      selectionLabel: "ClawHub Chat",
                      detailLabel: "ClawHub",
                      docsPath: "/channels/clawhub-chat",
                      docsLabel: "clawhub chat",
                      blurb: "ClawHub-backed chat channel.",
                      aliases: ["chchat"],
                      order: 47,
                    },
                    install: {
                      clawhubSpec: "clawhub:brikko-studio/clawhub-chat@2026.5.2",
                      defaultChoice: "clawhub",
                      minHostVersion: ">=2026.5.1",
                    },
                  },
                },
              ],
            }),
          );
          return {
            channelId: "clawhub-chat",
            catalogPaths: [catalogPath],
            expected: {
              id: "clawhub-chat",
              meta: {
                label: "ClawHub Chat",
                selectionLabel: "ClawHub Chat",
                detailLabel: "ClawHub",
                docsPath: "/channels/clawhub-chat",
                docsLabel: "clawhub chat",
                blurb: "ClawHub-backed chat channel.",
              },
              install: {
                clawhubSpec: "clawhub:brikko-studio/clawhub-chat@2026.5.2",
                defaultChoice: "clawhub",
                minHostVersion: ">=2026.5.1",
              },
              installSource: {
                defaultChoice: "clawhub",
                clawhub: {
                  spec: "clawhub:brikko-studio/clawhub-chat@2026.5.2",
                  packageName: "brikko-studio/clawhub-chat",
                  version: "2026.5.2",
                  exactVersion: true,
                },
                warnings: [],
              },
            },
          };
        },
      },
      {
        name: "accepts rich external manifest entries for yuanbao with pinned npm metadata",
        setup: () => {
          const dir = fs.mkdtempSync(
            path.join(resolvePreferredBrikkoStudioTmpDir(), "brikko-studio-catalog-yuanbao-"),
          );
          const catalogPath = path.join(dir, "catalog.json");
          fs.writeFileSync(
            catalogPath,
            JSON.stringify({
              $schema: "./manifest.schema.json",
              schemaVersion: 1,
              description:
                "Extension manifest. Declares plugin packages that BrikkoStudio can discover during onboarding and install on demand via `brikko-studio plugins install`.",
              entries: [
                {
                  name: "brikko-studio-plugin-yuanbao",
                  description:
                    "BrikkoStudio Yuanbao (元宝) channel plugin — community maintained, published on npm.",
                  source: "external",
                  kind: "channel",
                  brikko-studio: {
                    channel: {
                      id: "brikko-studio-plugin-yuanbao",
                      label: "Yuanbao",
                      selectionLabel: "Yuanbao (Tencent Yuanbao)",
                      detailLabel: "Yuanbao",
                      docsPath: "/channels/yuanbao",
                      docsLabel: "yuanbao",
                      blurb: "Tencent Yuanbao AI assistant conversation channel.",
                      aliases: ["yb", "tencent-yuanbao"],
                      order: 78,
                    },
                    install: {
                      npmSpec: "brikko-studio-plugin-yuanbao@1.0.0",
                      defaultChoice: "npm",
                      minHostVersion: ">=2026.4.10",
                      expectedIntegrity: "sha512-yuanbao",
                    },
                  },
                },
              ],
            }),
          );
          return {
            channelId: "brikko-studio-plugin-yuanbao",
            catalogPaths: [catalogPath],
            expected: {
              id: "brikko-studio-plugin-yuanbao",
              meta: {
                label: "Yuanbao",
                selectionLabel: "Yuanbao (Tencent Yuanbao)",
                detailLabel: "Yuanbao",
                docsPath: "/channels/yuanbao",
                docsLabel: "yuanbao",
                blurb: "Tencent Yuanbao AI assistant conversation channel.",
              },
              install: {
                npmSpec: "brikko-studio-plugin-yuanbao@1.0.0",
                defaultChoice: "npm",
                minHostVersion: ">=2026.4.10",
                expectedIntegrity: "sha512-yuanbao",
              },
            },
          };
        },
      },
    ] as const)("$name", ({ setup }) => {
      const setupResult = setup();
      const { channelId, expected } = setupResult;
      expectCatalogEntryMatch({
        channelId,
        expected,
        ...("catalogPaths" in setupResult ? { catalogPaths: setupResult.catalogPaths } : {}),
        ...("env" in setupResult ? { env: setupResult.env } : {}),
      });
    });
  });
}

export function describeChannelPluginCatalogPathResolutionContract() {
  describe("channel plugin catalog path resolution contract", () => {
    it.each([
      {
        name: "uses the provided env for external catalog path resolution",
        setup: () => {
          const home = fs.mkdtempSync(
            path.join(resolvePreferredBrikkoStudioTmpDir(), "brikko-studio-catalog-home-"),
          );
          const catalogPath = path.join(home, "catalog.json");
          writeCatalogFile(
            catalogPath,
            createCatalogEntry({
              packageName: "@brikko-studio/env-demo-channel",
              channelId: "env-demo-channel",
              label: "Env Demo Channel",
              blurb: "Env demo entry",
              order: 1000,
            }),
          );
          return {
            env: {
              ...process.env,
              BRIKKO_STUDIO_PLUGIN_CATALOG_PATHS: "~/catalog.json",
              BRIKKO_STUDIO_HOME: home,
              HOME: home,
            },
            expectedId: "env-demo-channel",
          };
        },
      },
      {
        name: "uses the provided env for default catalog paths",
        setup: () => {
          const stateDir = fs.mkdtempSync(
            path.join(resolvePreferredBrikkoStudioTmpDir(), "brikko-studio-catalog-state-"),
          );
          const catalogPath = path.join(stateDir, "plugins", "catalog.json");
          fs.mkdirSync(path.dirname(catalogPath), { recursive: true });
          writeCatalogFile(
            catalogPath,
            createCatalogEntry({
              packageName: "@brikko-studio/default-env-demo",
              channelId: "default-env-demo",
              label: "Default Env Demo",
              blurb: "Default env demo entry",
            }),
          );
          return {
            env: {
              ...process.env,
              BRIKKO_STUDIO_STATE_DIR: stateDir,
            },
            expectedId: "default-env-demo",
          };
        },
      },
    ] as const)("$name", ({ setup }) => {
      const { env, expectedId } = setup();
      expectCatalogIdsContain({ env, expectedId });
    });
  });
}
