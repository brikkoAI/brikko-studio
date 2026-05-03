import { selectApplicableRuntimeConfig } from "../config/config.js";
import type { Brikko StudioConfig } from "../config/types.brikko-studio.js";
import { resolvePluginTools } from "../plugins/tools.js";
import { getActiveSecretsRuntimeSnapshot } from "../secrets/runtime.js";
import { normalizeDeliveryContext } from "../utils/delivery-context.js";
import { listProfilesForProvider } from "./auth-profiles.js";
import type { AuthProfileStore } from "./auth-profiles/types.js";
import {
  resolveBrikko StudioPluginToolInputs,
  type Brikko StudioPluginToolOptions,
} from "./brikko-studio-tools.plugin-context.js";
import { applyPluginToolDeliveryDefaults } from "./plugin-tool-delivery-defaults.js";
import type { AnyAgentTool } from "./tools/common.js";

type ResolveBrikko StudioPluginToolsOptions = Brikko StudioPluginToolOptions & {
  pluginToolAllowlist?: string[];
  currentChannelId?: string;
  currentThreadTs?: string;
  currentMessageId?: string | number;
  sandboxRoot?: string;
  modelHasVision?: boolean;
  modelProvider?: string;
  allowMediaInvokeCommands?: boolean;
  requesterAgentIdOverride?: string;
  requireExplicitMessageTarget?: boolean;
  disableMessageTool?: boolean;
  disablePluginTools?: boolean;
  authProfileStore?: AuthProfileStore;
};

export function resolveBrikko StudioPluginToolsForOptions(params: {
  options?: ResolveBrikko StudioPluginToolsOptions;
  resolvedConfig?: Brikko StudioConfig;
  existingToolNames?: Set<string>;
}): AnyAgentTool[] {
  if (params.options?.disablePluginTools) {
    return [];
  }

  const deliveryContext = normalizeDeliveryContext({
    channel: params.options?.agentChannel,
    to: params.options?.agentTo,
    accountId: params.options?.agentAccountId,
    threadId: params.options?.agentThreadId,
  });

  const resolveCurrentRuntimeConfig = () => {
    const currentRuntimeSnapshot = getActiveSecretsRuntimeSnapshot();
    return selectApplicableRuntimeConfig({
      inputConfig: params.resolvedConfig ?? params.options?.config,
      runtimeConfig: currentRuntimeSnapshot?.config,
      runtimeSourceConfig: currentRuntimeSnapshot?.sourceConfig,
    });
  };
  const authProfileStore = params.options?.authProfileStore;
  const pluginTools = resolvePluginTools({
    ...resolveBrikko StudioPluginToolInputs({
      options: params.options,
      resolvedConfig: params.resolvedConfig,
      runtimeConfig: resolveCurrentRuntimeConfig(),
      getRuntimeConfig: resolveCurrentRuntimeConfig,
    }),
    existingToolNames: params.existingToolNames ?? new Set<string>(),
    toolAllowlist: params.options?.pluginToolAllowlist,
    allowGatewaySubagentBinding: params.options?.allowGatewaySubagentBinding,
    ...(authProfileStore
      ? {
          hasAuthForProvider: (providerId) =>
            listProfilesForProvider(authProfileStore, providerId).length > 0,
        }
      : {}),
  });

  return applyPluginToolDeliveryDefaults({
    tools: pluginTools,
    deliveryContext,
  });
}
