// Narrow Matrix monitor helper seam.
// Keep monitor internals off the broad package runtime-api barrel so monitor
// tests and shared workers do not pull unrelated Matrix helper surfaces.

export type { NormalizedLocation } from "brikko-studio/plugin-sdk/channel-location";
export type { PluginRuntime, RuntimeLogger } from "brikko-studio/plugin-sdk/plugin-runtime";
export type { BlockReplyContext, ReplyPayload } from "brikko-studio/plugin-sdk/reply-runtime";
export type { MarkdownTableMode, BrikkoStudioConfig } from "brikko-studio/plugin-sdk/config-types";
export type { RuntimeEnv } from "brikko-studio/plugin-sdk/runtime";
export {
  addAllowlistUserEntriesFromConfigEntry,
  buildAllowlistResolutionSummary,
  canonicalizeAllowlistWithResolvedIds,
  formatAllowlistMatchMeta,
  patchAllowlistUsersInConfigEntries,
  summarizeMapping,
} from "brikko-studio/plugin-sdk/allow-from";
export {
  createReplyPrefixOptions,
  createTypingCallbacks,
} from "brikko-studio/plugin-sdk/channel-reply-options-runtime";
export { formatLocationText, toLocationContext } from "brikko-studio/plugin-sdk/channel-location";
export { getAgentScopedMediaLocalRoots } from "brikko-studio/plugin-sdk/agent-media-payload";
export { logInboundDrop, logTypingFailure } from "brikko-studio/plugin-sdk/channel-logging";
export {
  buildChannelKeyCandidates,
  resolveChannelEntryMatch,
} from "brikko-studio/plugin-sdk/channel-targets";
