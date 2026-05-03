import type { BrikkoStudioConfig } from "../config/types.brikko-studio.js";
import { resolvePluginCapabilityProviders } from "../plugins/capability-provider-runtime.js";
import {
  buildCapabilityProviderMaps,
  normalizeCapabilityProviderId,
} from "../plugins/provider-registry-shared.js";
import type { RealtimeTranscriptionProviderPlugin } from "../plugins/types.js";
import type { RealtimeTranscriptionProviderId } from "./provider-types.js";

export function normalizeRealtimeTranscriptionProviderId(
  providerId: string | undefined,
): RealtimeTranscriptionProviderId | undefined {
  return normalizeCapabilityProviderId(providerId);
}

function resolveRealtimeTranscriptionProviderEntries(
  cfg?: BrikkoStudioConfig,
): RealtimeTranscriptionProviderPlugin[] {
  return resolvePluginCapabilityProviders({
    key: "realtimeTranscriptionProviders",
    cfg,
  });
}

function buildProviderMaps(cfg?: BrikkoStudioConfig): {
  canonical: Map<string, RealtimeTranscriptionProviderPlugin>;
  aliases: Map<string, RealtimeTranscriptionProviderPlugin>;
} {
  return buildCapabilityProviderMaps(resolveRealtimeTranscriptionProviderEntries(cfg));
}

export function listRealtimeTranscriptionProviders(
  cfg?: BrikkoStudioConfig,
): RealtimeTranscriptionProviderPlugin[] {
  return [...buildProviderMaps(cfg).canonical.values()];
}

export function getRealtimeTranscriptionProvider(
  providerId: string | undefined,
  cfg?: BrikkoStudioConfig,
): RealtimeTranscriptionProviderPlugin | undefined {
  const normalized = normalizeRealtimeTranscriptionProviderId(providerId);
  if (!normalized) {
    return undefined;
  }
  return buildProviderMaps(cfg).aliases.get(normalized);
}

export function canonicalizeRealtimeTranscriptionProviderId(
  providerId: string | undefined,
  cfg?: BrikkoStudioConfig,
): RealtimeTranscriptionProviderId | undefined {
  const normalized = normalizeRealtimeTranscriptionProviderId(providerId);
  if (!normalized) {
    return undefined;
  }
  return getRealtimeTranscriptionProvider(normalized, cfg)?.id ?? normalized;
}
