import {
  applyAgentDefaultModelPrimary,
  type BrikkoStudioConfig,
} from "brikko-studio/plugin-sdk/provider-onboard";
import { DEEPINFRA_BASE_URL, DEEPINFRA_DEFAULT_MODEL_REF } from "./provider-models.js";

export { DEEPINFRA_BASE_URL, DEEPINFRA_DEFAULT_MODEL_REF };

export function applyDeepInfraProviderConfig(
  cfg: BrikkoStudioConfig,
  modelRef: string = DEEPINFRA_DEFAULT_MODEL_REF,
): BrikkoStudioConfig {
  const models = { ...cfg.agents?.defaults?.models };
  models[modelRef] = {
    ...models[modelRef],
    alias: models[modelRef]?.alias ?? "DeepInfra",
  };

  return {
    ...cfg,
    agents: {
      ...cfg.agents,
      defaults: {
        ...cfg.agents?.defaults,
        models,
      },
    },
  };
}

export function applyDeepInfraConfig(
  cfg: BrikkoStudioConfig,
  modelRef: string = DEEPINFRA_DEFAULT_MODEL_REF,
): BrikkoStudioConfig {
  return applyAgentDefaultModelPrimary(applyDeepInfraProviderConfig(cfg, modelRef), modelRef);
}
