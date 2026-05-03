import fs from "node:fs";
import path from "node:path";
import { bundledPluginRoot } from "brikko-studio/plugin-sdk/test-fixtures";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildOfficialChannelCatalog,
  OFFICIAL_CHANNEL_CATALOG_RELATIVE_PATH,
  writeOfficialChannelCatalog,
} from "../scripts/write-official-channel-catalog.mjs";
import { describePluginInstallSource } from "../src/plugins/install-source-info.js";
import { cleanupTempDirs, makeTempRepoRoot, writeJsonFile } from "./helpers/temp-repo.js";

const tempDirs: string[] = [];

function makeRepoRoot(prefix: string): string {
  return makeTempRepoRoot(tempDirs, prefix);
}

function writeJson(filePath: string, value: unknown): void {
  writeJsonFile(filePath, value);
}

afterEach(() => {
  cleanupTempDirs(tempDirs);
});

describe("buildOfficialChannelCatalog", () => {
  it("includes publishable official channel plugins and skips non-publishable entries", () => {
    const repoRoot = makeRepoRoot("brikko-studio-official-channel-catalog-");
    writeJson(path.join(repoRoot, "extensions", "whatsapp", "package.json"), {
      name: "@brikko-studio/whatsapp",
      version: "2026.3.23",
      description: "BrikkoStudio WhatsApp channel plugin",
      brikko-studio: {
        channel: {
          id: "whatsapp",
          label: "WhatsApp",
          selectionLabel: "WhatsApp (QR link)",
          detailLabel: "WhatsApp Web",
          docsPath: "/channels/whatsapp",
          blurb: "works with your own number; recommend a separate phone + eSIM.",
        },
        install: {
          npmSpec: "@brikko-studio/whatsapp",
          localPath: bundledPluginRoot("whatsapp"),
          defaultChoice: "npm",
        },
        release: {
          publishToNpm: true,
        },
      },
    });
    writeJson(path.join(repoRoot, "extensions", "local-only", "package.json"), {
      name: "@brikko-studio/local-only",
      brikko-studio: {
        channel: {
          id: "local-only",
          label: "Local Only",
          selectionLabel: "Local Only",
          docsPath: "/channels/local-only",
          blurb: "dev only",
        },
        install: {
          localPath: bundledPluginRoot("local-only"),
        },
        release: {
          publishToNpm: false,
        },
      },
    });

    expect(buildOfficialChannelCatalog({ repoRoot }).entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "@wecom/wecom-brikko-studio-plugin",
          brikko-studio: expect.objectContaining({
            plugin: {
              id: "wecom-brikko-studio-plugin",
              label: "WeCom",
            },
            channel: expect.objectContaining({
              id: "wecom",
              label: "WeCom",
            }),
            install: {
              npmSpec: "@wecom/wecom-brikko-studio-plugin@2026.4.23",
              defaultChoice: "npm",
              expectedIntegrity:
                "sha512-bnzfdIEEu1/LFvcdyjaTkyxt27w6c7dqhkPezU62OWaqmcdFsUGR3T55USK/O9pIKsNcnL1Tnu1pqKYCWHFgWQ==",
            },
          }),
        }),
        expect.objectContaining({
          name: "brikko-studio-plugin-yuanbao",
          brikko-studio: expect.objectContaining({
            plugin: {
              id: "brikko-studio-plugin-yuanbao",
              label: "Yuanbao",
            },
            channel: expect.objectContaining({
              id: "yuanbao",
              label: "Yuanbao",
            }),
            install: {
              npmSpec: "brikko-studio-plugin-yuanbao@2.11.0",
              defaultChoice: "npm",
              expectedIntegrity:
                "sha512-lYmBrU71ox3v7dzRqaltvzTXPcMjjgYrNqpBj5HIBkXgEFkXRRG8wplXg9Fub41/FjsSPn3WAbYpdTc+k+jsHg==",
            },
          }),
        }),
        expect.objectContaining({
          name: "@brikko-studio/whatsapp",
          description: "BrikkoStudio WhatsApp channel plugin",
          source: "official",
          brikko-studio: expect.objectContaining({
            channel: expect.objectContaining({
              id: "whatsapp",
              label: "WhatsApp",
              selectionLabel: "WhatsApp (QR link)",
              detailLabel: "WhatsApp Web",
              docsPath: "/channels/whatsapp",
            }),
            install: expect.objectContaining({
              npmSpec: "@brikko-studio/whatsapp",
              defaultChoice: "npm",
            }),
          }),
        }),
      ]),
    );
  });

  it("keeps third-party official external catalog npm sources exactly pinned", () => {
    const repoRoot = makeRepoRoot("brikko-studio-official-channel-catalog-policy-");
    const entries = buildOfficialChannelCatalog({ repoRoot }).entries.filter(
      (entry) => entry.source === "external" && !entry.name?.startsWith("@brikko-studio/"),
    );

    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      const installSource = describePluginInstallSource(entry.brikko-studio?.install ?? {});
      expect(installSource.warnings).toEqual([]);
      expect(installSource.npm?.pinState).toBe("exact-with-integrity");
    }
  });

  it("allows official BrikkoStudio channel npm specs without integrity during launch", () => {
    const repoRoot = makeRepoRoot("brikko-studio-official-channel-catalog-brikko-studio-policy-");
    const twitch = buildOfficialChannelCatalog({ repoRoot }).entries.find(
      (entry) => entry.brikko-studio?.channel?.id === "twitch",
    );

    expect(twitch).toEqual(
      expect.objectContaining({
        name: "@brikko-studio/twitch",
        brikko-studio: expect.objectContaining({
          install: {
            npmSpec: "@brikko-studio/twitch",
            defaultChoice: "npm",
            minHostVersion: ">=2026.4.10",
          },
        }),
      }),
    );
    const installSource = describePluginInstallSource(twitch?.brikko-studio?.install ?? {});
    expect(installSource.npm?.pinState).toBe("floating-without-integrity");
    expect(installSource.warnings).toEqual(["npm-spec-floating", "npm-spec-missing-integrity"]);
  });

  it("preserves ClawHub specs when generating publishable channel catalog entries", () => {
    const repoRoot = makeRepoRoot("brikko-studio-official-channel-catalog-clawhub-");
    writeJson(path.join(repoRoot, "extensions", "storepack-chat", "package.json"), {
      name: "@brikko-studio/storepack-chat",
      brikko-studio: {
        channel: {
          id: "storepack-chat",
          label: "Storepack Chat",
          selectionLabel: "Storepack Chat",
          docsPath: "/channels/storepack-chat",
          blurb: "storepack-first channel",
        },
        install: {
          clawhubSpec: "clawhub:@brikko-studio/storepack-chat",
          npmSpec: "@brikko-studio/storepack-chat",
          defaultChoice: "clawhub",
        },
        release: {
          publishToNpm: true,
        },
      },
    });

    const entry = buildOfficialChannelCatalog({ repoRoot }).entries.find(
      (candidate) => candidate.brikko-studio?.channel?.id === "storepack-chat",
    );

    expect(entry?.brikko-studio?.install).toEqual({
      clawhubSpec: "clawhub:@brikko-studio/storepack-chat",
      npmSpec: "@brikko-studio/storepack-chat",
      defaultChoice: "clawhub",
    });
  });

  it("writes the official catalog under dist", () => {
    const repoRoot = makeRepoRoot("brikko-studio-official-channel-catalog-write-");
    writeJson(path.join(repoRoot, "extensions", "whatsapp", "package.json"), {
      name: "@brikko-studio/whatsapp",
      brikko-studio: {
        channel: {
          id: "whatsapp",
          label: "WhatsApp",
          selectionLabel: "WhatsApp",
          docsPath: "/channels/whatsapp",
          blurb: "wa",
        },
        install: {
          npmSpec: "@brikko-studio/whatsapp",
        },
        release: {
          publishToNpm: true,
        },
      },
    });

    writeOfficialChannelCatalog({ repoRoot });

    const outputPath = path.join(repoRoot, OFFICIAL_CHANNEL_CATALOG_RELATIVE_PATH);
    expect(fs.existsSync(outputPath)).toBe(true);
    expect(JSON.parse(fs.readFileSync(outputPath, "utf8")).entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "@wecom/wecom-brikko-studio-plugin",
        }),
        expect.objectContaining({
          name: "brikko-studio-plugin-yuanbao",
        }),
        expect.objectContaining({
          name: "@brikko-studio/whatsapp",
          source: "official",
          brikko-studio: expect.objectContaining({
            channel: expect.objectContaining({
              id: "whatsapp",
              label: "WhatsApp",
              selectionLabel: "WhatsApp (QR link)",
              docsPath: "/channels/whatsapp",
            }),
            install: expect.objectContaining({
              npmSpec: "@brikko-studio/whatsapp",
              defaultChoice: "npm",
            }),
          }),
        }),
      ]),
    );
    const whatsappEntries = JSON.parse(fs.readFileSync(outputPath, "utf8")).entries.filter(
      (entry: { brikko-studio?: { channel?: { id?: string } } }) =>
        entry.brikko-studio?.channel?.id === "whatsapp",
    );
    expect(whatsappEntries).toHaveLength(1);
  });
});
