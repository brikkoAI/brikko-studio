import {
  applyAgentDefaultModelPrimary,
  type Brikko StudioConfig,
} from "brikko-studio/plugin-sdk/provider-onboard";

export const OPENCODE_GO_DEFAULT_MODEL_REF = "opencode-go/kimi-k2.6";

export function applyOpencodeGoProviderConfig(cfg: Brikko StudioConfig): Brikko StudioConfig {
  return cfg;
}

export function applyOpencodeGoConfig(cfg: Brikko StudioConfig): Brikko StudioConfig {
  return applyAgentDefaultModelPrimary(
    applyOpencodeGoProviderConfig(cfg),
    OPENCODE_GO_DEFAULT_MODEL_REF,
  );
}
