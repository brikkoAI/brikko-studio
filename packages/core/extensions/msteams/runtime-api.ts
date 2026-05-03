// Private runtime barrel for the bundled Microsoft Teams extension.
// Keep this barrel thin and aligned with the local extension surface.

export { DEFAULT_ACCOUNT_ID } from "brikko-studio/plugin-sdk/account-id";
export type { AllowlistMatch } from "brikko-studio/plugin-sdk/allow-from";
export {
  mergeAllowlist,
  resolveAllowlistMatchSimple,
  summarizeMapping,
} from "brikko-studio/plugin-sdk/allow-from";
export type {
  BaseProbeResult,
  ChannelDirectoryEntry,
  ChannelGroupContext,
  ChannelMessageActionName,
  ChannelOutboundAdapter,
} from "brikko-studio/plugin-sdk/channel-contract";
export type { ChannelPlugin } from "brikko-studio/plugin-sdk/channel-core";
export { logTypingFailure } from "brikko-studio/plugin-sdk/channel-logging";
export { createChannelPairingController } from "brikko-studio/plugin-sdk/channel-pairing";
export {
  evaluateSenderGroupAccessForPolicy,
  readStoreAllowFromForDmPolicy,
  resolveDmGroupAccessWithLists,
  resolveEffectiveAllowFromLists,
  resolveSenderScopedGroupPolicy,
  resolveToolsBySender,
} from "brikko-studio/plugin-sdk/channel-policy";
export { createChannelReplyPipeline } from "brikko-studio/plugin-sdk/channel-reply-pipeline";
export {
  PAIRING_APPROVED_MESSAGE,
  buildProbeChannelStatusSummary,
  createDefaultChannelRuntimeState,
} from "brikko-studio/plugin-sdk/channel-status";
export {
  buildChannelKeyCandidates,
  normalizeChannelSlug,
  resolveChannelEntryMatchWithFallback,
  resolveNestedAllowlistDecision,
} from "brikko-studio/plugin-sdk/channel-targets";
export type {
  GroupPolicy,
  GroupToolPolicyConfig,
  MSTeamsChannelConfig,
  MSTeamsConfig,
  MSTeamsReplyStyle,
  MSTeamsTeamConfig,
  MarkdownTableMode,
  Brikko StudioConfig,
} from "brikko-studio/plugin-sdk/config-types";
export { isDangerousNameMatchingEnabled } from "brikko-studio/plugin-sdk/dangerous-name-runtime";
export { resolveDefaultGroupPolicy } from "brikko-studio/plugin-sdk/runtime-group-policy";
export { withFileLock } from "brikko-studio/plugin-sdk/file-lock";
export { keepHttpServerTaskAlive } from "brikko-studio/plugin-sdk/channel-lifecycle";
export {
  detectMime,
  extensionForMime,
  extractOriginalFilename,
  getFileExtension,
  resolveChannelMediaMaxBytes,
} from "brikko-studio/plugin-sdk/media-runtime";
export { dispatchReplyFromConfigWithSettledDispatcher } from "brikko-studio/plugin-sdk/inbound-reply-dispatch";
export { loadOutboundMediaFromUrl } from "brikko-studio/plugin-sdk/outbound-media";
export { buildMediaPayload } from "brikko-studio/plugin-sdk/reply-payload";
export type { ReplyPayload } from "brikko-studio/plugin-sdk/reply-payload";
export type { PluginRuntime } from "brikko-studio/plugin-sdk/runtime-store";
export type { RuntimeEnv } from "brikko-studio/plugin-sdk/runtime";
export type { SsrFPolicy } from "brikko-studio/plugin-sdk/ssrf-runtime";
export { fetchWithSsrFGuard } from "brikko-studio/plugin-sdk/ssrf-runtime";
export { normalizeStringEntries } from "brikko-studio/plugin-sdk/string-normalization-runtime";
export { chunkTextForOutbound } from "brikko-studio/plugin-sdk/text-chunking";
export { DEFAULT_WEBHOOK_MAX_BODY_BYTES } from "brikko-studio/plugin-sdk/webhook-ingress";
export { setMSTeamsRuntime } from "./src/runtime.js";
