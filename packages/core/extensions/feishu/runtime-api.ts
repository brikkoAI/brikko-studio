// Private runtime barrel for the bundled Feishu extension.
// Keep this barrel thin and generic-only.

export type {
  AllowlistMatch,
  AnyAgentTool,
  BaseProbeResult,
  ChannelGroupContext,
  ChannelMessageActionName,
  ChannelMeta,
  ChannelOutboundAdapter,
  ChannelPlugin,
  HistoryEntry,
  Brikko StudioConfig,
  Brikko StudioPluginApi,
  OutboundIdentity,
  PluginRuntime,
  ReplyPayload,
} from "brikko-studio/plugin-sdk/core";
export type { Brikko StudioConfig as ClawdbotConfig } from "brikko-studio/plugin-sdk/core";
export type { RuntimeEnv } from "brikko-studio/plugin-sdk/runtime";
export type { GroupToolPolicyConfig } from "brikko-studio/plugin-sdk/config-types";
export {
  DEFAULT_ACCOUNT_ID,
  buildChannelConfigSchema,
  createActionGate,
  createDedupeCache,
} from "brikko-studio/plugin-sdk/core";
export {
  PAIRING_APPROVED_MESSAGE,
  buildProbeChannelStatusSummary,
  createDefaultChannelRuntimeState,
} from "brikko-studio/plugin-sdk/channel-status";
export { buildAgentMediaPayload } from "brikko-studio/plugin-sdk/agent-media-payload";
export { createChannelPairingController } from "brikko-studio/plugin-sdk/channel-pairing";
export { createReplyPrefixContext } from "brikko-studio/plugin-sdk/channel-reply-pipeline";
export {
  evaluateSupplementalContextVisibility,
  filterSupplementalContextItems,
  resolveChannelContextVisibilityMode,
} from "brikko-studio/plugin-sdk/context-visibility-runtime";
export {
  loadSessionStore,
  resolveSessionStoreEntry,
} from "brikko-studio/plugin-sdk/session-store-runtime";
export { readJsonFileWithFallback } from "brikko-studio/plugin-sdk/json-store";
export { createPersistentDedupe } from "brikko-studio/plugin-sdk/persistent-dedupe";
export { normalizeAgentId } from "brikko-studio/plugin-sdk/routing";
export { chunkTextForOutbound } from "brikko-studio/plugin-sdk/text-chunking";
export {
  isRequestBodyLimitError,
  readRequestBodyWithLimit,
  requestBodyErrorToText,
} from "brikko-studio/plugin-sdk/webhook-ingress";
export { setFeishuRuntime } from "./src/runtime.js";
