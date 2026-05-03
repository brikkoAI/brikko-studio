import type { BrikkoStudioConfig } from "../../config/types.brikko-studio.js";

export function createPerSenderSessionConfig(
  overrides: Partial<NonNullable<BrikkoStudioConfig["session"]>> = {},
): NonNullable<BrikkoStudioConfig["session"]> {
  return {
    mainKey: "main",
    scope: "per-sender",
    ...overrides,
  };
}
