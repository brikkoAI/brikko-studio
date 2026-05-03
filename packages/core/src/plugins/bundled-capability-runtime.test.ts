import { describe, expect, it } from "vitest";
import { buildVitestCapabilityShimAliasMap } from "./bundled-capability-runtime.js";

describe("buildVitestCapabilityShimAliasMap", () => {
  it("keeps scoped and unscoped capability shim aliases aligned", () => {
    const aliasMap = buildVitestCapabilityShimAliasMap();

    expect(aliasMap["brikko-studio/plugin-sdk/config-runtime"]).toBe(
      aliasMap["@brikko-studio/plugin-sdk/config-runtime"],
    );
    expect(aliasMap["brikko-studio/plugin-sdk/media-runtime"]).toBe(
      aliasMap["@brikko-studio/plugin-sdk/media-runtime"],
    );
    expect(aliasMap["brikko-studio/plugin-sdk/provider-onboard"]).toBe(
      aliasMap["@brikko-studio/plugin-sdk/provider-onboard"],
    );
    expect(aliasMap["brikko-studio/plugin-sdk/speech-core"]).toBe(
      aliasMap["@brikko-studio/plugin-sdk/speech-core"],
    );
  });
});
