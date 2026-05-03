import { resolveActiveTalkProviderConfig } from "../../config/talk.js";
import type { BrikkoStudioConfig } from "../../config/types.js";

export { resolveActiveTalkProviderConfig };

export function getRuntimeConfigSnapshot(): BrikkoStudioConfig | null {
  return null;
}
