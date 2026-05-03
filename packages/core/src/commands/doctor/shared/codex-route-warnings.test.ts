import { describe, expect, it } from "vitest";
import type { BrikkoStudioConfig } from "../../../config/types.brikko-studio.js";
import { collectCodexRouteWarnings } from "./codex-route-warnings.js";

function codexPluginConfig(): Pick<BrikkoStudioConfig, "plugins"> {
  return {
    plugins: {
      entries: {
        codex: { enabled: true },
      },
    },
  } as Pick<BrikkoStudioConfig, "plugins">;
}

describe("collectCodexRouteWarnings", () => {
  it("warns when the Codex plugin is enabled but openai-codex models still route through PI", () => {
    const warnings = collectCodexRouteWarnings({
      cfg: {
        ...codexPluginConfig(),
        agents: {
          defaults: {
            model: "openai-codex/gpt-5.5",
          },
        },
      } as BrikkoStudioConfig,
    });

    expect(warnings).toEqual([expect.stringContaining("Codex plugin is enabled")]);
    expect(warnings[0]).toContain("agents.defaults.model");
    expect(warnings[0]).toContain('runtime "pi"');
    expect(warnings[0]).toContain('agentRuntime.id: "codex"');
  });

  it("does not warn when the native Codex runtime is selected", () => {
    const warnings = collectCodexRouteWarnings({
      cfg: {
        ...codexPluginConfig(),
        agents: {
          defaults: {
            model: "openai-codex/gpt-5.5",
            agentRuntime: {
              id: "codex",
            },
          },
        },
      } as BrikkoStudioConfig,
    });

    expect(warnings).toEqual([]);
  });

  it("does not warn when BRIKKO_STUDIO_AGENT_RUNTIME selects native Codex", () => {
    const warnings = collectCodexRouteWarnings({
      cfg: {
        ...codexPluginConfig(),
        agents: {
          defaults: {
            model: "openai-codex/gpt-5.5",
          },
        },
      } as BrikkoStudioConfig,
      env: {
        BRIKKO_STUDIO_AGENT_RUNTIME: "codex",
      },
    });

    expect(warnings).toEqual([]);
  });

  it("does not warn unless the Codex plugin is explicitly enabled or allowed", () => {
    const warnings = collectCodexRouteWarnings({
      cfg: {
        agents: {
          defaults: {
            model: "openai-codex/gpt-5.5",
          },
        },
      } as BrikkoStudioConfig,
    });

    expect(warnings).toEqual([]);
  });
});
