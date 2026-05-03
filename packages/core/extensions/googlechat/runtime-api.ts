// Private runtime barrel for the bundled Google Chat extension.
// Keep this barrel thin and avoid broad plugin-sdk surfaces during bootstrap.

export { DEFAULT_ACCOUNT_ID } from "brikko-studio/plugin-sdk/account-id";
export {
  createActionGate,
  jsonResult,
  readNumberParam,
  readReactionParams,
  readStringParam,
} from "brikko-studio/plugin-sdk/channel-actions";
export { buildChannelConfigSchema } from "brikko-studio/plugin-sdk/channel-config-primitives";
export type {
  ChannelMessageActionAdapter,
  ChannelMessageActionName,
  ChannelStatusIssue,
} from "brikko-studio/plugin-sdk/channel-contract";
export { missingTargetError } from "brikko-studio/plugin-sdk/channel-feedback";
export {
  createAccountStatusSink,
  runPassiveAccountLifecycle,
} from "brikko-studio/plugin-sdk/channel-lifecycle";
export { createChannelPairingController } from "brikko-studio/plugin-sdk/channel-pairing";
export { createChannelReplyPipeline } from "brikko-studio/plugin-sdk/channel-reply-pipeline";
export {
  evaluateGroupRouteAccessForPolicy,
  resolveDmGroupAccessWithLists,
  resolveSenderScopedGroupPolicy,
} from "brikko-studio/plugin-sdk/channel-policy";
export { PAIRING_APPROVED_MESSAGE } from "brikko-studio/plugin-sdk/channel-status";
export { chunkTextForOutbound } from "brikko-studio/plugin-sdk/text-chunking";
export type { Brikko StudioConfig } from "brikko-studio/plugin-sdk/config-types";
export { GoogleChatConfigSchema } from "brikko-studio/plugin-sdk/bundled-channel-config-schema";
export {
  GROUP_POLICY_BLOCKED_LABEL,
  resolveAllowlistProviderRuntimeGroupPolicy,
  resolveDefaultGroupPolicy,
  warnMissingProviderGroupPolicyFallbackOnce,
} from "brikko-studio/plugin-sdk/runtime-group-policy";
export { isDangerousNameMatchingEnabled } from "brikko-studio/plugin-sdk/dangerous-name-runtime";
export { fetchRemoteMedia, resolveChannelMediaMaxBytes } from "brikko-studio/plugin-sdk/media-runtime";
export { loadOutboundMediaFromUrl } from "brikko-studio/plugin-sdk/outbound-media";
export type { PluginRuntime } from "brikko-studio/plugin-sdk/runtime-store";
export { fetchWithSsrFGuard } from "brikko-studio/plugin-sdk/ssrf-runtime";
export type { GoogleChatAccountConfig, GoogleChatConfig } from "brikko-studio/plugin-sdk/config-types";
export { extractToolSend } from "brikko-studio/plugin-sdk/tool-send";
export { resolveInboundMentionDecision } from "brikko-studio/plugin-sdk/channel-inbound";
export { resolveInboundRouteEnvelopeBuilderWithRuntime } from "brikko-studio/plugin-sdk/inbound-envelope";
export { resolveWebhookPath } from "brikko-studio/plugin-sdk/webhook-path";
export {
  registerWebhookTargetWithPluginRoute,
  resolveWebhookTargetWithAuthOrReject,
  withResolvedWebhookRequestPipeline,
} from "brikko-studio/plugin-sdk/webhook-targets";
export {
  createWebhookInFlightLimiter,
  readJsonWebhookBodyOrReject,
  type WebhookInFlightLimiter,
} from "brikko-studio/plugin-sdk/webhook-request-guards";
export { setGoogleChatRuntime } from "./src/runtime.js";
