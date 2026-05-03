import type { Brikko StudioConfig } from "../config/types.brikko-studio.js";
import { normalizeDeliveryContext } from "../utils/delivery-context.js";
import type { GatewayMessageChannel } from "../utils/message-channel.js";
import { resolveAgentWorkspaceDir, resolveSessionAgentIds } from "./agent-scope.js";
import type { ToolFsPolicy } from "./tool-fs-policy.js";
import { resolveWorkspaceRoot } from "./workspace-dir.js";

export type Brikko StudioPluginToolOptions = {
  agentSessionKey?: string;
  agentChannel?: GatewayMessageChannel;
  agentAccountId?: string;
  agentTo?: string;
  agentThreadId?: string | number;
  agentDir?: string;
  workspaceDir?: string;
  config?: Brikko StudioConfig;
  fsPolicy?: ToolFsPolicy;
  requesterSenderId?: string | null;
  requesterAgentIdOverride?: string;
  senderIsOwner?: boolean;
  sessionId?: string;
  sandboxBrowserBridgeUrl?: string;
  allowHostBrowserControl?: boolean;
  sandboxed?: boolean;
  allowGatewaySubagentBinding?: boolean;
};

export function resolveBrikko StudioPluginToolInputs(params: {
  options?: Brikko StudioPluginToolOptions;
  resolvedConfig?: Brikko StudioConfig;
  runtimeConfig?: Brikko StudioConfig;
  getRuntimeConfig?: () => Brikko StudioConfig | undefined;
}) {
  const { options, resolvedConfig, runtimeConfig, getRuntimeConfig } = params;
  const { sessionAgentId } = resolveSessionAgentIds({
    sessionKey: options?.agentSessionKey,
    config: resolvedConfig,
    agentId: options?.requesterAgentIdOverride,
  });
  const inferredWorkspaceDir =
    options?.workspaceDir || !resolvedConfig
      ? undefined
      : resolveAgentWorkspaceDir(resolvedConfig, sessionAgentId);
  const workspaceDir = resolveWorkspaceRoot(options?.workspaceDir ?? inferredWorkspaceDir);
  const deliveryContext = normalizeDeliveryContext({
    channel: options?.agentChannel,
    to: options?.agentTo,
    accountId: options?.agentAccountId,
    threadId: options?.agentThreadId,
  });

  return {
    context: {
      config: options?.config,
      runtimeConfig,
      getRuntimeConfig,
      fsPolicy: options?.fsPolicy,
      workspaceDir,
      agentDir: options?.agentDir,
      agentId: sessionAgentId,
      sessionKey: options?.agentSessionKey,
      sessionId: options?.sessionId,
      browser: {
        sandboxBridgeUrl: options?.sandboxBrowserBridgeUrl,
        allowHostControl: options?.allowHostBrowserControl,
      },
      messageChannel: options?.agentChannel,
      agentAccountId: options?.agentAccountId,
      deliveryContext,
      requesterSenderId: options?.requesterSenderId ?? undefined,
      senderIsOwner: options?.senderIsOwner ?? undefined,
      sandboxed: options?.sandboxed,
    },
    allowGatewaySubagentBinding: options?.allowGatewaySubagentBinding,
  };
}
