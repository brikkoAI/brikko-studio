import type { Brikko StudioConfig } from "brikko-studio/plugin-sdk/config-types";
import { inspectSlackAccount } from "./src/account-inspect.js";

export function inspectSlackReadOnlyAccount(cfg: Brikko StudioConfig, accountId?: string | null) {
  return inspectSlackAccount({ cfg, accountId });
}
