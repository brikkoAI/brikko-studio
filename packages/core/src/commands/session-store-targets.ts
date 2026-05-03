import {
  resolveSessionStoreTargets,
  type SessionStoreSelectionOptions,
  type SessionStoreTarget,
} from "../config/sessions.js";
import type { BrikkoStudioConfig } from "../config/types.brikko-studio.js";
import { formatErrorMessage } from "../infra/errors.js";
import type { RuntimeEnv } from "../runtime.js";
export { resolveSessionStoreTargets, type SessionStoreSelectionOptions, type SessionStoreTarget };

export function resolveSessionStoreTargetsOrExit(params: {
  cfg: BrikkoStudioConfig;
  opts: SessionStoreSelectionOptions;
  runtime: RuntimeEnv;
}): SessionStoreTarget[] | null {
  try {
    return resolveSessionStoreTargets(params.cfg, params.opts);
  } catch (error) {
    params.runtime.error(formatErrorMessage(error));
    params.runtime.exit(1);
    return null;
  }
}
