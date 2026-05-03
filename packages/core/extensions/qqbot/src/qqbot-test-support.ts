import type { BrikkoStudioConfig } from "brikko-studio/plugin-sdk/config-types";

export function makeQqbotSecretRefConfig(): BrikkoStudioConfig {
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
  } as BrikkoStudioConfig;
}

export function makeQqbotDefaultAccountConfig(): BrikkoStudioConfig {
  return {
    channels: {
      qqbot: {
        defaultAccount: "bot2",
        accounts: {
          bot2: { appId: "123456" },
        },
      },
    },
  } as BrikkoStudioConfig;
}
