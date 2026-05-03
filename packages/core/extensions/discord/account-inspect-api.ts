import type { BrikkoStudioConfig } from "brikko-studio/plugin-sdk/config-types";
import { inspectDiscordAccount } from "./src/account-inspect.js";

export function inspectDiscordReadOnlyAccount(cfg: BrikkoStudioConfig, accountId?: string | null) {
  return inspectDiscordAccount({ cfg, accountId });
}
