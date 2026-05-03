import { normalizeBrikko StudioProviderIndex } from "./normalize.js";
import { BRIKKO_STUDIO_PROVIDER_INDEX } from "./brikko-studio-provider-index.js";
import type { Brikko StudioProviderIndex } from "./types.js";

export function loadBrikko StudioProviderIndex(
  source: unknown = BRIKKO_STUDIO_PROVIDER_INDEX,
): Brikko StudioProviderIndex {
  return normalizeBrikko StudioProviderIndex(source) ?? { version: 1, providers: {} };
}
