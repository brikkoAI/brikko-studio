import type { BrikkoStudioConfig } from "../config/types.js";
import {
  buildCapabilityProviderMaps,
  normalizeCapabilityProviderId,
} from "../plugins/provider-registry-shared.js";
import type { SpeechProviderPlugin } from "../plugins/types.js";
import type { SpeechProviderId } from "./provider-types.js";

export type SpeechProviderRegistryResolver = {
  getProvider: (providerId: string, cfg?: BrikkoStudioConfig) => SpeechProviderPlugin | undefined;
  listProviders: (cfg?: BrikkoStudioConfig) => SpeechProviderPlugin[];
};

export function normalizeSpeechProviderId(
  providerId: string | undefined,
): SpeechProviderId | undefined {
  return normalizeCapabilityProviderId(providerId);
}

export function createSpeechProviderRegistry(resolver: SpeechProviderRegistryResolver) {
  const buildResolvedProviderMaps = (cfg?: BrikkoStudioConfig) =>
    buildCapabilityProviderMaps(resolver.listProviders(cfg));

  const listProviders = (cfg?: BrikkoStudioConfig): SpeechProviderPlugin[] => [
    ...buildResolvedProviderMaps(cfg).canonical.values(),
  ];

  const getProvider = (
    providerId: string | undefined,
    cfg?: BrikkoStudioConfig,
  ): SpeechProviderPlugin | undefined => {
    const normalized = normalizeSpeechProviderId(providerId);
    if (!normalized) {
      return undefined;
    }
    return (
      resolver.getProvider(normalized, cfg) ??
      buildResolvedProviderMaps(cfg).aliases.get(normalized)
    );
  };

  const canonicalizeProviderId = (
    providerId: string | undefined,
    cfg?: BrikkoStudioConfig,
  ): SpeechProviderId | undefined => {
    const normalized = normalizeSpeechProviderId(providerId);
    if (!normalized) {
      return undefined;
    }
    return getProvider(normalized, cfg)?.id ?? normalized;
  };

  return {
    canonicalizeSpeechProviderId: canonicalizeProviderId,
    getSpeechProvider: getProvider,
    listSpeechProviders: listProviders,
  };
}
