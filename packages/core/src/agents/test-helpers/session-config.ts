import type { Brikko StudioConfig } from "../../config/types.brikko-studio.js";

export function createPerSenderSessionConfig(
  overrides: Partial<NonNullable<Brikko StudioConfig["session"]>> = {},
): NonNullable<Brikko StudioConfig["session"]> {
  return {
    mainKey: "main",
    scope: "per-sender",
    ...overrides,
  };
}
