import type { BrikkoStudioConfig } from "./runtime-api.js";
import { inspectTelegramAccount } from "./src/account-inspect.js";

export function inspectTelegramReadOnlyAccount(cfg: BrikkoStudioConfig, accountId?: string | null) {
  return inspectTelegramAccount({ cfg, accountId });
}
