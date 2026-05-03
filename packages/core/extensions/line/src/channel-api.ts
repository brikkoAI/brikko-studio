export { clearAccountEntryFields } from "brikko-studio/plugin-sdk/core";
import { DEFAULT_ACCOUNT_ID } from "brikko-studio/plugin-sdk/account-id";
import type { BrikkoStudioConfig } from "brikko-studio/plugin-sdk/account-resolution";
import type { ChannelPlugin } from "brikko-studio/plugin-sdk/core";
import { listLineAccountIds, resolveDefaultLineAccountId, resolveLineAccount } from "./accounts.js";
import { resolveExactLineGroupConfigKey } from "./group-keys.js";
import type { LineConfig, ResolvedLineAccount } from "./types.js";

export {
  DEFAULT_ACCOUNT_ID,
  listLineAccountIds,
  resolveDefaultLineAccountId,
  resolveExactLineGroupConfigKey,
  resolveLineAccount,
};

export type { ChannelPlugin, LineConfig, BrikkoStudioConfig, ResolvedLineAccount };
