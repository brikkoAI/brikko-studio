import { readStringOrNumberParam, readStringParam } from "brikko-studio/plugin-sdk/channel-actions";
import type { Brikko StudioConfig } from "brikko-studio/plugin-sdk/config-types";

export { resolveReactionMessageId } from "brikko-studio/plugin-sdk/channel-actions";
export { handleWhatsAppAction } from "./action-runtime.js";
export { isWhatsAppGroupJid, normalizeWhatsAppTarget } from "./normalize.js";
export { readStringOrNumberParam, readStringParam, type Brikko StudioConfig };
