import { resolveDefaultModelForAgent } from "../agents/model-selection.js";
import type { BrikkoStudioConfig } from "../config/config.js";

export function resolveCommitmentDefaultModelRef(params: {
  cfg: BrikkoStudioConfig;
  agentId?: string;
}): { provider: string; model: string } {
  return resolveDefaultModelForAgent(params);
}
