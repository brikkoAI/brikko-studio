import type { Brikko StudioConfig } from "brikko-studio/plugin-sdk/config-types";

export function makeQqbotSecretRefConfig(): Brikko StudioConfig {
  return {
    channels: {
      qqbot: {
        appId: "123456",
        clientSecret: {
          source: "env",
          provider: "default",
          id: "QQBOT_CLIENT_SECRET",
        },
      },
    },
  } as Brikko StudioConfig;
}

export function makeQqbotDefaultAccountConfig(): Brikko StudioConfig {
  return {
    channels: {
      qqbot: {
        defaultAccount: "bot2",
        accounts: {
          bot2: { appId: "123456" },
        },
      },
    },
  } as Brikko StudioConfig;
}
