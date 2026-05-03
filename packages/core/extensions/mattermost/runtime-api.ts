// Private runtime barrel for the bundled Mattermost extension.
// Keep this barrel thin and generic-only.

export type {
  BaseProbeResult,
  ChannelAccountSnapshot,
  ChannelDirectoryEntry,
  ChannelGroupContext,
  ChannelMessageActionName,
  ChannelPlugin,
  ChatType,
  HistoryEntry,
  BrikkoStudioConfig,
  BrikkoStudioPluginApi,
  PluginRuntime,
} from "brikko-studio/plugin-sdk/core";
export type { RuntimeEnv } from "brikko-studio/plugin-sdk/runtime";
export type { ReplyPayload } from "brikko-studio/plugin-sdk/reply-runtime";
export type { ModelsProviderData } from "brikko-studio/plugin-sdk/command-auth";
export type {
  BlockStreamingCoalesceConfig,
  DmPolicy,
  GroupPolicy,
} from "brikko-studio/plugin-sdk/config-types";
export {
  DEFAULT_ACCOUNT_ID,
  buildChannelConfigSchema,
  createDedupeCache,
  parseStrictPositiveInteger,
  resolveClientIp,
  isTrustedProxyAddress,
} from "brikko-studio/plugin-sdk/core";
export { buildComputedAccountStatusSnapshot } from "brikko-studio/plugin-sdk/channel-status";
export { createAccountStatusSink } from "brikko-studio/plugin-sdk/channel-lifecycle";
export { buildAgentMediaPayload } from "brikko-studio/plugin-sdk/agent-media-payload";
export {
  buildModelsProviderData,
  listSkillCommandsForAgents,
  resolveControlCommandGate,
  resolveStoredModelOverride,
} from "brikko-studio/plugin-sdk/command-auth";
export {
  GROUP_POLICY_BLOCKED_LABEL,
  resolveAllowlistProviderRuntimeGroupPolicy,
  resolveDefaultGroupPolicy,
  warnMissingProviderGroupPolicyFallbackOnce,
} from "brikko-studio/plugin-sdk/runtime-group-policy";
export { isDangerousNameMatchingEnabled } from "brikko-studio/plugin-sdk/dangerous-name-runtime";
export { loadSessionStore, resolveStorePath } from "brikko-studio/plugin-sdk/session-store-runtime";
export { formatInboundFromLabel } from "brikko-studio/plugin-sdk/channel-inbound";
export { logInboundDrop } from "brikko-studio/plugin-sdk/channel-inbound";
export { createChannelPairingController } from "brikko-studio/plugin-sdk/channel-pairing";
export {
  DM_GROUP_ACCESS_REASON,
  readStoreAllowFromForDmPolicy,
  resolveDmGroupAccessWithLists,
  resolveEffectiveAllowFromLists,
} from "brikko-studio/plugin-sdk/channel-policy";
export { evaluateSenderGroupAccessForPolicy } from "brikko-studio/plugin-sdk/group-access";
export { createChannelReplyPipeline } from "brikko-studio/plugin-sdk/channel-reply-pipeline";
export { logTypingFailure } from "brikko-studio/plugin-sdk/channel-feedback";
export { loadOutboundMediaFromUrl } from "brikko-studio/plugin-sdk/outbound-media";
export { rawDataToString } from "brikko-studio/plugin-sdk/webhook-ingress";
export { chunkTextForOutbound } from "brikko-studio/plugin-sdk/text-chunking";
export {
  DEFAULT_GROUP_HISTORY_LIMIT,
  buildPendingHistoryContextFromMap,
  clearHistoryEntriesIfEnabled,
  recordPendingHistoryEntryIfEnabled,
} from "brikko-studio/plugin-sdk/reply-history";
export { normalizeAccountId, resolveThreadSessionKeys } from "brikko-studio/plugin-sdk/routing";
export { resolveAllowlistMatchSimple } from "brikko-studio/plugin-sdk/allow-from";
export { registerPluginHttpRoute } from "brikko-studio/plugin-sdk/webhook-targets";
export {
  isRequestBodyLimitError,
  readRequestBodyWithLimit,
} from "brikko-studio/plugin-sdk/webhook-ingress";
export {
  applyAccountNameToChannelSection,
  applySetupAccountConfigPatch,
  migrateBaseNameToDefaultAccount,
} from "brikko-studio/plugin-sdk/setup";
export {
  getAgentScopedMediaLocalRoots,
  resolveChannelMediaMaxBytes,
} from "brikko-studio/plugin-sdk/media-runtime";
export { normalizeProviderId } from "brikko-studio/plugin-sdk/provider-model-shared";
export { setMattermostRuntime } from "./src/runtime.js";
