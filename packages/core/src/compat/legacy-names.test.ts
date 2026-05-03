import { describe, expect, it } from "vitest";
import { LEGACY_MANIFEST_KEYS, MANIFEST_KEY, PROJECT_NAME } from "./legacy-names.js";

describe("compat/legacy-names", () => {
  it("keeps the current manifest key primary while exposing legacy fallbacks", () => {
    expect(PROJECT_NAME).toBe("brikko-studio");
    expect(MANIFEST_KEY).toBe("brikko-studio");
    expect(LEGACY_MANIFEST_KEYS).toEqual(["clawdbot"]);
  });
});
