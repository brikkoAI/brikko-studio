import { buildManifestModelProviderConfig } from "brikko-studio/plugin-sdk/provider-catalog-shared";
import type { ModelProviderConfig } from "brikko-studio/plugin-sdk/provider-model-shared";
import manifest from "./brikko-studio.plugin.json" with { type: "json" };

export function buildMistralProvider(): ModelProviderConfig {
  return buildManifestModelProviderConfig({
    providerId: "mistral",
    catalog: manifest.modelCatalog.providers.mistral,
  });
}
