import { buildManifestModelProviderConfig } from "brikko-studio/plugin-sdk/provider-catalog-shared";
import type { ModelProviderConfig } from "brikko-studio/plugin-sdk/provider-model-shared";
import manifest from "./brikko-studio.plugin.json" with { type: "json" };

export function buildTogetherProvider(): ModelProviderConfig {
  return buildManifestModelProviderConfig({
    providerId: "together",
    catalog: manifest.modelCatalog.providers.together,
  });
}
