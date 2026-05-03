import {
  applyAgentDefaultModelPrimary,
  type BrikkoStudioConfig,
} from "brikko-studio/plugin-sdk/provider-onboard";

export const OPENCODE_GO_DEFAULT_MODEL_REF = "opencode-go/kimi-k2.6";

export function applyOpencodeGoProviderConfig(cfg: BrikkoStudioConfig): BrikkoStudioConfig {
  return cfg;
}

export function applyOpencodeGoConfig(cfg: BrikkoStudioConfig): BrikkoStudioConfig {
  return applyAgentDefaultModelPrimary(
    applyOpencodeGoProviderConfig(cfg),
    OPENCODE_GO_DEFAULT_MODEL_REF,
  );
}
