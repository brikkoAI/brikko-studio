import type { BrikkoStudioConfig } from "../../config/types.brikko-studio.js";

export function makeModelFallbackCfg(overrides: Partial<BrikkoStudioConfig> = {}): BrikkoStudioConfig {
  return {
    agents: {
      defaults: {
        model: {
          primary: "openai/gpt-4.1-mini",
          fallbacks: ["anthropic/claude-haiku-3-5"],
        },
      },
    },
    ...overrides,
  } as BrikkoStudioConfig;
}
