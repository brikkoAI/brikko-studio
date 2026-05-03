import { resolveActiveTalkProviderConfig } from "../../config/talk.js";
import type { Brikko StudioConfig } from "../../config/types.js";

export { resolveActiveTalkProviderConfig };

export function getRuntimeConfigSnapshot(): Brikko StudioConfig | null {
  return null;
}
