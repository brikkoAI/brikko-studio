import {
  installChannelSetupContractSuite,
  installChannelStatusContractSuite,
} from "brikko-studio/plugin-sdk/channel-test-helpers";
import type { Brikko StudioConfig } from "brikko-studio/plugin-sdk/config-types";
import { describe, expect } from "vitest";
import { linePlugin, lineSetupPlugin } from "../api.js";

describe("line setup contract", () => {
  installChannelSetupContractSuite({
    plugin: lineSetupPlugin,
    cases: [
      {
        name: "default account stores token and secret",
        cfg: {} as Brikko StudioConfig,
        input: {
          channelAccessToken: "line-token",
          channelSecret: "line-secret",
        } as never,
        expectedAccountId: "default",
        assertPatchedConfig: (cfg) => {
          expect(cfg.channels?.line?.enabled).toBe(true);
          expect(cfg.channels?.line?.channelAccessToken).toBe("line-token");
          expect(cfg.channels?.line?.channelSecret).toBe("line-secret");
        },
      },
      {
        name: "non-default env setup is rejected",
        cfg: {} as Brikko StudioConfig,
        accountId: "ops",
        input: {
          useEnv: true,
        },
        expectedAccountId: "ops",
        expectedValidation: "LINE_CHANNEL_ACCESS_TOKEN can only be used for the default account.",
      },
    ],
  });
});

describe("line status contract", () => {
  installChannelStatusContractSuite({
    plugin: linePlugin,
    cases: [
      {
        name: "configured account produces a webhook status snapshot",
        cfg: {
          channels: {
            line: {
              enabled: true,
              channelAccessToken: "line-token",
              channelSecret: "line-secret",
            },
          },
        } as Brikko StudioConfig,
        runtime: {
          accountId: "default",
          running: true,
        },
        probe: { ok: true },
        assertSnapshot: (snapshot) => {
          expect(snapshot.accountId).toBe("default");
          expect(snapshot.enabled).toBe(true);
          expect(snapshot.configured).toBe(true);
          expect(snapshot.mode).toBe("webhook");
        },
      },
    ],
  });
});
