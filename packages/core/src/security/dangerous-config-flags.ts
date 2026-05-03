import { resolveAgentWorkspaceDir, resolveDefaultAgentId } from "../agents/agent-scope.js";
import type { BrikkoStudioConfig } from "../config/types.brikko-studio.js";
import {
  collectPluginConfigContractMatches,
  resolvePluginConfigContractsById,
} from "../plugins/config-contracts.js";
import { isRecord } from "../utils.js";
import { collectEnabledInsecureOrDangerousFlagsFromContracts } from "./dangerous-config-flags-core.js";

export function collectEnabledInsecureOrDangerousFlags(cfg: BrikkoStudioConfig): string[] {
  const pluginEntries = cfg.plugins?.entries;
  if (!isRecord(pluginEntries)) {
    return collectEnabledInsecureOrDangerousFlagsFromContracts(cfg);
  }

  const configContracts = resolvePluginConfigContractsById({
    config: cfg,
    workspaceDir: resolveAgentWorkspaceDir(cfg, resolveDefaultAgentId(cfg)),
    env: process.env,
    pluginIds: Object.keys(pluginEntries),
  });
  return collectEnabledInsecureOrDangerousFlagsFromContracts(cfg, {
    collectPluginConfigContractMatches,
    configContractsById: configContracts,
  });
}
