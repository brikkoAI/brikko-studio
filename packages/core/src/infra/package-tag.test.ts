import { describe, expect, it } from "vitest";
import { normalizePackageTagInput } from "./package-tag.js";

describe("normalizePackageTagInput", () => {
  const packageNames = ["brikko-studio", "@brikko-studio/plugin"] as const;

  it.each([
    { input: undefined, expected: null },
    { input: "   ", expected: null },
    { input: "brikko-studio@beta", expected: "beta" },
    { input: "@brikko-studio/plugin@2026.2.24", expected: "2026.2.24" },
    { input: "brikko-studio@   ", expected: null },
    { input: "brikko-studio", expected: null },
    { input: " @brikko-studio/plugin ", expected: null },
    { input: " latest ", expected: "latest" },
    { input: "@other/plugin@beta", expected: "@other/plugin@beta" },
    { input: "brikko-studioer@beta", expected: "brikko-studioer@beta" },
  ] satisfies ReadonlyArray<{ input: string | undefined; expected: string | null }>)(
    "normalizes %j",
    ({ input, expected }) => {
      expect(normalizePackageTagInput(input, packageNames)).toBe(expected);
    },
  );
});
