import type { Brikko StudioConfig } from "./runtime-api.js";
import { inspectTelegramAccount } from "./src/account-inspect.js";

export function inspectTelegramReadOnlyAccount(cfg: Brikko StudioConfig, accountId?: string | null) {
  return inspectTelegramAccount({ cfg, accountId });
}
