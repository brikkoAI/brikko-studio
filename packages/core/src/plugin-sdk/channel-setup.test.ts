import { runSetupWizardFinalize } from "brikko-studio/plugin-sdk/plugin-test-runtime";
import { describe, expect, it } from "vitest";
import { createOptionalChannelSetupSurface } from "./channel-setup.js";

describe("createOptionalChannelSetupSurface", () => {
  it("returns a matched adapter and wizard for optional plugins", async () => {
    const setup = createOptionalChannelSetupSurface({
      channel: "example",
      label: "Example",
      npmSpec: "@brikko-studio/example",
      docsPath: "/channels/example",
    });

    expect(setup.setupAdapter.resolveAccountId?.({ cfg: {} })).toBe("default");
    expect(
      setup.setupAdapter.validateInput?.({
        cfg: {},
        accountId: "default",
        input: {},
      }),
    ).toContain("@brikko-studio/example");
    expect(setup.setupWizard.channel).toBe("example");
    expect(setup.setupWizard.status.unconfiguredHint).toContain("/channels/example");
    await expect(
      runSetupWizardFinalize({
        finalize: setup.setupWizard.finalize,
        runtime: {
          log: () => {},
          error: () => {},
          exit: async () => {},
        },
      }),
    ).rejects.toThrow("@brikko-studio/example");
  });
});
