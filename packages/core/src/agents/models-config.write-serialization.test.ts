import fs from "node:fs/promises";
import path from "node:path";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveInstalledPluginIndexPolicyHash } from "../plugins/installed-plugin-index-policy.js";
import type { PluginMetadataSnapshot } from "../plugins/plugin-metadata-snapshot.js";
import { resolveBrikko StudioAgentDir } from "./agent-paths.js";
import {
  CUSTOM_PROXY_MODELS_CONFIG,
  installModelsConfigTestHooks,
  withModelsTempHome,
} from "./models-config.e2e-harness.js";
import { readGeneratedModelsJson } from "./models-config.test-utils.js";

const planBrikko StudioModelsJsonMock = vi.fn();

installModelsConfigTestHooks();

let ensureBrikko StudioModelsJson: typeof import("./models-config.js").ensureBrikko StudioModelsJson;
let clearCurrentPluginMetadataSnapshot: typeof import("../plugins/current-plugin-metadata-snapshot.js").clearCurrentPluginMetadataSnapshot;
let setCurrentPluginMetadataSnapshot: typeof import("../plugins/current-plugin-metadata-snapshot.js").setCurrentPluginMetadataSnapshot;

function createPluginMetadataSnapshot(workspaceDir: string): PluginMetadataSnapshot {
  const policyHash = resolveInstalledPluginIndexPolicyHash({});
  return {
    policyHash,
    workspaceDir,
    index: {
      version: 1,
      hostContractVersion: "test",
      compatRegistryVersion: "test",
      migrationVersion: 1,
      policyHash,
      generatedAtMs: 1,
      installRecords: {},
      plugins: [],
      diagnostics: [],
    },
    registryDiagnostics: [],
    manifestRegistry: { plugins: [], diagnostics: [] },
    plugins: [],
    diagnostics: [],
    byPluginId: new Map(),
    normalizePluginId: (pluginId) => pluginId,
    owners: {
      channels: new Map(),
      channelConfigs: new Map(),
      providers: new Map(),
      modelCatalogProviders: new Map(),
      cliBackends: new Map(),
      setupProviders: new Map(),
      commandAliases: new Map(),
      contracts: new Map(),
    },
    metrics: {
      registrySnapshotMs: 0,
      manifestRegistryMs: 0,
      ownerMapsMs: 0,
      totalMs: 0,
      indexPluginCount: 0,
      manifestPluginCount: 0,
    },
  };
}

beforeAll(async () => {
  vi.doMock("./models-config.plan.js", () => ({
    planBrikko StudioModelsJson: (...args: unknown[]) => planBrikko StudioModelsJsonMock(...args),
  }));
  ({ ensureBrikko StudioModelsJson } = await import("./models-config.js"));
  ({ clearCurrentPluginMetadataSnapshot, setCurrentPluginMetadataSnapshot } =
    await import("../plugins/current-plugin-metadata-snapshot.js"));
});

beforeEach(() => {
  clearCurrentPluginMetadataSnapshot();
  planBrikko StudioModelsJsonMock
    .mockReset()
    .mockImplementation(async (params: { cfg?: typeof CUSTOM_PROXY_MODELS_CONFIG }) => ({
      action: "write",
      contents: `${JSON.stringify({ providers: params.cfg?.models?.providers ?? {} }, null, 2)}\n`,
    }));
});

describe("models-config write serialization", () => {
  it("does not reuse default workspace plugin metadata for explicit agent dirs without workspace", async () => {
    await withModelsTempHome(async (home) => {
      const snapshot = createPluginMetadataSnapshot(path.join(home, "default-workspace"));
      setCurrentPluginMetadataSnapshot(snapshot, { config: {} });
      const agentDir = path.join(home, "agent-non-default");

      await ensureBrikko StudioModelsJson({}, agentDir);

      expect(planBrikko StudioModelsJsonMock).toHaveBeenCalledWith(
        expect.not.objectContaining({ pluginMetadataSnapshot: snapshot }),
      );
    });
  });

  it("reuses current plugin metadata for explicit agent dirs with matching workspace", async () => {
    await withModelsTempHome(async (home) => {
      const workspaceDir = path.join(home, "agent-workspace");
      const snapshot = createPluginMetadataSnapshot(workspaceDir);
      setCurrentPluginMetadataSnapshot(snapshot, { config: {} });
      const agentDir = path.join(home, "agent-non-default");

      await ensureBrikko StudioModelsJson({}, agentDir, { workspaceDir });

      expect(planBrikko StudioModelsJsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceDir,
          pluginMetadataSnapshot: snapshot,
        }),
      );
    });
  });

  it("does not reuse scoped startup discovery cache for a different provider scope", async () => {
    await withModelsTempHome(async (home) => {
      planBrikko StudioModelsJsonMock.mockImplementation(async () => ({ action: "skip" }));
      const agentDir = path.join(home, "agent");
      await ensureBrikko StudioModelsJson({}, agentDir, {
        providerDiscoveryProviderIds: ["openai"],
        providerDiscoveryTimeoutMs: 5000,
      });
      await ensureBrikko StudioModelsJson({}, agentDir, {
        providerDiscoveryProviderIds: ["anthropic"],
        providerDiscoveryTimeoutMs: 5000,
      });

      expect(planBrikko StudioModelsJsonMock).toHaveBeenCalledTimes(2);
      expect(planBrikko StudioModelsJsonMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          providerDiscoveryProviderIds: ["anthropic"],
          providerDiscoveryTimeoutMs: 5000,
        }),
      );
    });
  });

  it("keeps the ready cache warm after models.json is written", async () => {
    await withModelsTempHome(async () => {
      await ensureBrikko StudioModelsJson(CUSTOM_PROXY_MODELS_CONFIG);
      await ensureBrikko StudioModelsJson(CUSTOM_PROXY_MODELS_CONFIG);

      expect(planBrikko StudioModelsJsonMock).toHaveBeenCalledTimes(1);
    });
  });

  it("invalidates the ready cache when models.json changes externally", async () => {
    await withModelsTempHome(async () => {
      await ensureBrikko StudioModelsJson(CUSTOM_PROXY_MODELS_CONFIG);
      await ensureBrikko StudioModelsJson(CUSTOM_PROXY_MODELS_CONFIG);

      const modelPath = path.join(resolveBrikko StudioAgentDir(), "models.json");
      await fs.writeFile(modelPath, `${JSON.stringify({ external: true })}\n`, "utf8");
      const externalMtime = new Date(Date.now() + 2000);
      await fs.utimes(modelPath, externalMtime, externalMtime);
      await ensureBrikko StudioModelsJson(CUSTOM_PROXY_MODELS_CONFIG);

      expect(planBrikko StudioModelsJsonMock).toHaveBeenCalledTimes(2);
    });
  });

  it("keeps distinct config fingerprints cached without evicting each other", async () => {
    await withModelsTempHome(async () => {
      planBrikko StudioModelsJsonMock.mockImplementation(async () => ({ action: "noop" }));
      const first = structuredClone(CUSTOM_PROXY_MODELS_CONFIG);
      const second = structuredClone(CUSTOM_PROXY_MODELS_CONFIG);
      first.agents = { defaults: { model: "openai/gpt-5.4" } };
      second.agents = { defaults: { model: "anthropic/claude-sonnet-4-5" } };

      await ensureBrikko StudioModelsJson(first);
      await ensureBrikko StudioModelsJson(second);
      await ensureBrikko StudioModelsJson(first);

      expect(planBrikko StudioModelsJsonMock).toHaveBeenCalledTimes(2);
    });
  });

  it("serializes concurrent models.json writes to avoid overlap", async () => {
    await withModelsTempHome(async () => {
      const first = structuredClone(CUSTOM_PROXY_MODELS_CONFIG);
      const second = structuredClone(CUSTOM_PROXY_MODELS_CONFIG);
      const firstModel = first.models?.providers?.["custom-proxy"]?.models?.[0];
      const secondModel = second.models?.providers?.["custom-proxy"]?.models?.[0];
      if (!firstModel || !secondModel) {
        throw new Error("custom-proxy fixture missing expected model entries");
      }
      firstModel.name = "Proxy A";
      secondModel.name = "Proxy B with longer name";

      const originalWriteFile = fs.writeFile.bind(fs);
      let inFlightWrites = 0;
      let maxInFlightWrites = 0;
      const writeSpy = vi.spyOn(fs, "writeFile").mockImplementation(async (...args) => {
        const targetArg = args[0];
        const targetPath =
          typeof targetArg === "string"
            ? targetArg
            : targetArg instanceof URL
              ? targetArg.pathname
              : undefined;
        const isModelsTempWrite =
          typeof targetPath === "string" &&
          path.basename(targetPath).startsWith("models.json.") &&
          targetPath.endsWith(".tmp");
        if (isModelsTempWrite) {
          inFlightWrites += 1;
          if (inFlightWrites > maxInFlightWrites) {
            maxInFlightWrites = inFlightWrites;
          }
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
        try {
          return await originalWriteFile(...args);
        } finally {
          if (isModelsTempWrite) {
            inFlightWrites -= 1;
          }
        }
      });

      try {
        await Promise.all([ensureBrikko StudioModelsJson(first), ensureBrikko StudioModelsJson(second)]);
      } finally {
        writeSpy.mockRestore();
      }

      expect(maxInFlightWrites).toBe(1);
      const parsed = await readGeneratedModelsJson<{
        providers: { "custom-proxy"?: { models?: Array<{ name?: string }> } };
      }>();
      expect(["Proxy A", "Proxy B with longer name"]).toContain(
        parsed.providers["custom-proxy"]?.models?.[0]?.name,
      );
    });
  }, 60_000);
});
