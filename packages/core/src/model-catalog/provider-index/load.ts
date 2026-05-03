import { normalizeBrikkoStudioProviderIndex } from "./normalize.js";
import { BRIKKO_STUDIO_PROVIDER_INDEX } from "./brikko-studio-provider-index.js";
import type { BrikkoStudioProviderIndex } from "./types.js";

export function loadBrikkoStudioProviderIndex(
  source: unknown = BRIKKO_STUDIO_PROVIDER_INDEX,
): BrikkoStudioProviderIndex {
  return normalizeBrikkoStudioProviderIndex(source) ?? { version: 1, providers: {} };
}
