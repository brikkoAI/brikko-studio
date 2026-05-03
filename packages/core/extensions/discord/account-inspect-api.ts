import type { Brikko StudioConfig } from "brikko-studio/plugin-sdk/config-types";
import { inspectDiscordAccount } from "./src/account-inspect.js";

export function inspectDiscordReadOnlyAccount(cfg: Brikko StudioConfig, accountId?: string | null) {
  return inspectDiscordAccount({ cfg, accountId });
}
