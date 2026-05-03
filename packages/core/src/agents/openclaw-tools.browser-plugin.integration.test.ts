import { afterEach, describe, expect, it, vi } from "vitest";
import type { BrikkoStudioConfig } from "../config/config.js";
import { activateSecretsRuntimeSnapshot, clearSecretsRuntimeSnapshot } from "../secrets/runtime.js";
import { resolveBrikkoStudioPluginToolsForOptions } from "./brikko-studio-plugin-tools.js";

const hoisted = vi.hoisted(() => ({
  resolvePluginTools: vi.fn(),
}));

vi.mock("../plugins/tools.js", () => ({
  resolvePluginTools: (...args: unknown[]) => hoisted.resolvePluginTools(...args),
}));

describe("createBrikkoStudioTools browser plugin integration", () => {
  afterEach(() => {
    hoisted.resolvePluginTools.mockReset();
    clearSecretsRuntimeSnapshot();
  });

  it("keeps the browser tool returned by plugin resolution", () => {
    hoisted.resolvePluginTools.mockReturnValue([
      {
        name: "browser",
        description: "browser fixture tool",
        parameters: {
          type: "object",
          properties: {},
        },
        async execute() {
          return {
            content: [{ type: "text", text: "ok" }],
          };
        },
      },
    ]);

    const config = {
      plugins: {
        allow: ["browser"],
      },
    } as BrikkoStudioConfig;

    const tools = resolveBrikkoStudioPluginToolsForOptions({
      options: { config },
      resolvedConfig: config,
    });

    expect(tools.map((tool) => tool.name)).toContain("browser");
  });

  it("omits the browser tool when plugin resolution returns no browser tool", () => {
    hoisted.resolvePluginTools.mockReturnValue([]);

    const config = {
      plugins: {
        allow: ["browser"],
        entries: {
          browser: {
            enabled: false,
          },
        },
      },
    } as BrikkoStudioConfig;

    const tools = resolveBrikkoStudioPluginToolsForOptions({
      options: { config },
      resolvedConfig: config,
    });

    expect(tools.map((tool) => tool.name)).not.toContain("browser");
  });

  it("forwards fsPolicy into plugin tool context", async () => {
    let capturedContext: { fsPolicy?: { workspaceOnly: boolean } } | undefined;
    hoisted.resolvePluginTools.mockImplementation((params: unknown) => {
      const resolvedParams = params as { context?: { fsPolicy?: { workspaceOnly: boolean } } };
      capturedContext = resolvedParams.context;
      return [
        {
          name: "browser",
          description: "browser fixture tool",
          parameters: {
            type: "object",
            properties: {},
          },
          async execute() {
            return {
              content: [{ type: "text", text: "ok" }],
              details: { workspaceOnly: capturedContext?.fsPolicy?.workspaceOnly ?? null },
            };
          },
        },
      ];
    });

    const tools = resolveBrikkoStudioPluginToolsForOptions({
      options: {
        config: {
          plugins: {
            allow: ["browser"],
          },
        } as BrikkoStudioConfig,
        fsPolicy: { workspaceOnly: true },
      },
      resolvedConfig: {
        plugins: {
          allow: ["browser"],
        },
      } as BrikkoStudioConfig,
    });

    const browserTool = tools.find((tool) => tool.name === "browser");
    expect(browserTool).toBeDefined();
    if (!browserTool) {
      throw new Error("expected browser tool");
    }

    const result = await browserTool.execute("tool-call", {});
    const details = (result.details ?? {}) as { workspaceOnly?: boolean | null };
    expect(details.workspaceOnly).toBe(true);
  });

  it("forwards gateway subagent binding to plugin resolution", () => {
    hoisted.resolvePluginTools.mockReturnValue([]);
    const config = {
      plugins: {
        allow: ["browser"],
      },
    } as BrikkoStudioConfig;

    resolveBrikkoStudioPluginToolsForOptions({
      options: { config, allowGatewaySubagentBinding: true },
      resolvedConfig: config,
    });

    expect(hoisted.resolvePluginTools).toHaveBeenCalledWith(
      expect.objectContaining({
        allowGatewaySubagentBinding: true,
      }),
    );
  });

  it("does not pass a stale active snapshot as plugin runtime config for a resolved run config", () => {
    const staleSourceConfig = {
      plugins: {
        allow: ["old-plugin"],
      },
    } as BrikkoStudioConfig;
    const staleRuntimeConfig = {
      plugins: {
        allow: ["old-plugin"],
      },
    } as BrikkoStudioConfig;
    const resolvedRunConfig = {
      plugins: {
        allow: ["browser"],
      },
      tools: {
        experimental: {
          planTool: true,
        },
      },
    } as BrikkoStudioConfig;
    let capturedRuntimeConfig: BrikkoStudioConfig | undefined;
    hoisted.resolvePluginTools.mockImplementation((params: unknown) => {
      capturedRuntimeConfig = (params as { context?: { runtimeConfig?: BrikkoStudioConfig } }).context
        ?.runtimeConfig;
      return [];
    });
    activateSecretsRuntimeSnapshot({
      sourceConfig: staleSourceConfig,
      config: staleRuntimeConfig,
      authStores: [],
      warnings: [],
      webTools: {
        search: {
          providerSource: "none",
          diagnostics: [],
        },
        fetch: {
          providerSource: "none",
          diagnostics: [],
        },
        diagnostics: [],
      },
    });

    resolveBrikkoStudioPluginToolsForOptions({
      options: { config: resolvedRunConfig },
      resolvedConfig: resolvedRunConfig,
    });

    expect(capturedRuntimeConfig).toBe(resolvedRunConfig);
  });

  it("exposes a live runtime config getter to plugin tool factories", () => {
    const sourceConfig = {
      plugins: {
        allow: ["memory-core"],
      },
    } as BrikkoStudioConfig;
    const firstRuntimeConfig = {
      plugins: {
        allow: ["memory-core"],
        entries: { "memory-core": { enabled: true } },
      },
    } as BrikkoStudioConfig;
    const nextRuntimeConfig = {
      plugins: {
        allow: ["memory-core"],
        entries: { "memory-core": { enabled: false } },
      },
    } as BrikkoStudioConfig;
    let getRuntimeConfig: (() => BrikkoStudioConfig | undefined) | undefined;
    hoisted.resolvePluginTools.mockImplementation((params: unknown) => {
      getRuntimeConfig = (
        params as { context?: { getRuntimeConfig?: () => BrikkoStudioConfig | undefined } }
      ).context?.getRuntimeConfig;
      return [];
    });
    activateSecretsRuntimeSnapshot({
      sourceConfig,
      config: firstRuntimeConfig,
      authStores: [],
      warnings: [],
      webTools: {
        search: {
          providerSource: "none",
          diagnostics: [],
        },
        fetch: {
          providerSource: "none",
          diagnostics: [],
        },
        diagnostics: [],
      },
    });

    resolveBrikkoStudioPluginToolsForOptions({
      options: { config: sourceConfig },
      resolvedConfig: sourceConfig,
    });

    expect(getRuntimeConfig?.()).toStrictEqual(firstRuntimeConfig);

    activateSecretsRuntimeSnapshot({
      sourceConfig,
      config: nextRuntimeConfig,
      authStores: [],
      warnings: [],
      webTools: {
        search: {
          providerSource: "none",
          diagnostics: [],
        },
        fetch: {
          providerSource: "none",
          diagnostics: [],
        },
        diagnostics: [],
      },
    });

    expect(getRuntimeConfig?.()).toStrictEqual(nextRuntimeConfig);
    expect(getRuntimeConfig?.()?.plugins?.entries?.["memory-core"]?.enabled).toBe(false);
  });
});
