import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createPluginSetupWizardStatus } from "brikko-studio/plugin-sdk/plugin-test-runtime";
import { withEnvAsync } from "brikko-studio/plugin-sdk/test-env";
import { describe, expect, it } from "vitest";
import "./zalo-js.test-mocks.js";
import { zalouserSetupPlugin } from "./setup-test-helpers.js";

const zalouserSetupGetStatus = createPluginSetupWizardStatus(zalouserSetupPlugin);

describe("zalouser setup plugin", () => {
  it("builds setup status without an initialized runtime", async () => {
    const stateDir = await mkdtemp(path.join(os.tmpdir(), "brikko-studio-zalouser-setup-"));

    try {
      await withEnvAsync({ BRIKKO_STUDIO_STATE_DIR: stateDir }, async () => {
        await expect(
          zalouserSetupGetStatus({
            cfg: {},
            accountOverrides: {},
          }),
        ).resolves.toMatchObject({
          channel: "zalouser",
          configured: false,
          statusLines: ["Zalo Personal: needs QR login"],
        });
      });
    } finally {
      await rm(stateDir, { recursive: true, force: true });
    }
  });
});
