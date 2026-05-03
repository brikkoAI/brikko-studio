import type { BrikkoStudioConfig } from "brikko-studio/plugin-sdk/config-types";
import { inspectSlackAccount } from "./src/account-inspect.js";

export function inspectSlackReadOnlyAccount(cfg: BrikkoStudioConfig, accountId?: string | null) {
  return inspectSlackAccount({ cfg, accountId });
}
