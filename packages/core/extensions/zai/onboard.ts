import {
  applyProviderConfigWithModelCatalogPreset,
  type Brikko StudioConfig,
} from "brikko-studio/plugin-sdk/provider-onboard";
import { normalizeOptionalString } from "brikko-studio/plugin-sdk/text-runtime";
import {
  buildZaiCatalogModels,
  resolveZaiBaseUrl,
  ZAI_DEFAULT_MODEL_ID,
} from "./model-definitions.js";

export const ZAI_DEFAULT_MODEL_REF = `zai/${ZAI_DEFAULT_MODEL_ID}`;

function resolveZaiPresetBaseUrl(cfg: Brikko StudioConfig, endpoint?: string): string {
  const existingProvider = cfg.models?.providers?.zai;
  const existingBaseUrl = normalizeOptionalString(existingProvider?.baseUrl) ?? "";
  return endpoint ? resolveZaiBaseUrl(endpoint) : existingBaseUrl || resolveZaiBaseUrl();
}

function applyZaiPreset(
  cfg: Brikko StudioConfig,
  params?: { endpoint?: string; modelId?: string },
  primaryModelRef?: string,
): Brikko StudioConfig {
  const modelId = normalizeOptionalString(params?.modelId) ?? ZAI_DEFAULT_MODEL_ID;
  const modelRef = `zai/${modelId}`;
  return applyProviderConfigWithModelCatalogPreset(cfg, {
    providerId: "zai",
    api: "openai-completions",
    baseUrl: resolveZaiPresetBaseUrl(cfg, params?.endpoint),
    catalogModels: buildZaiCatalogModels(),
    aliases: [{ modelRef, alias: "GLM" }],
    primaryModelRef,
  });
}

export function applyZaiProviderConfig(
  cfg: Brikko StudioConfig,
  params?: { endpoint?: string; modelId?: string },
): Brikko StudioConfig {
  return applyZaiPreset(cfg, params);
}

export function applyZaiConfig(
  cfg: Brikko StudioConfig,
  params?: { endpoint?: string; modelId?: string },
): Brikko StudioConfig {
  const modelId = normalizeOptionalString(params?.modelId) ?? ZAI_DEFAULT_MODEL_ID;
  const modelRef = modelId === ZAI_DEFAULT_MODEL_ID ? ZAI_DEFAULT_MODEL_REF : `zai/${modelId}`;
  return applyZaiPreset(cfg, params, modelRef);
}
