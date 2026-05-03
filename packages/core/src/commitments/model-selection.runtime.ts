import { resolveDefaultModelForAgent } from "../agents/model-selection.js";
import type { Brikko StudioConfig } from "../config/config.js";

export function resolveCommitmentDefaultModelRef(params: {
  cfg: Brikko StudioConfig;
  agentId?: string;
}): { provider: string; model: string } {
  return resolveDefaultModelForAgent(params);
}
