// Private runtime barrel for the bundled IRC extension.
// Keep this barrel thin and generic-only.

export type { BaseProbeResult } from "brikko-studio/plugin-sdk/channel-contract";
export type { ChannelPlugin } from "brikko-studio/plugin-sdk/channel-core";
export type { Brikko StudioConfig } from "brikko-studio/plugin-sdk/config-types";
export type { PluginRuntime } from "brikko-studio/plugin-sdk/runtime-store";
export type { RuntimeEnv } from "brikko-studio/plugin-sdk/runtime";
export type {
  BlockStreamingCoalesceConfig,
  DmConfig,
  DmPolicy,
  GroupPolicy,
  GroupToolPolicyBySenderConfig,
  GroupToolPolicyConfig,
  MarkdownConfig,
} from "brikko-studio/plugin-sdk/config-types";
export type { OutboundReplyPayload } from "brikko-studio/plugin-sdk/reply-payload";
export { DEFAULT_ACCOUNT_ID } from "brikko-studio/plugin-sdk/account-id";
export { buildChannelConfigSchema } from "brikko-studio/plugin-sdk/channel-config-primitives";
export {
  PAIRING_APPROVED_MESSAGE,
  buildBaseChannelStatusSummary,
} from "brikko-studio/plugin-sdk/channel-status";
export { createChannelPairingController } from "brikko-studio/plugin-sdk/channel-pairing";
export { createAccountStatusSink } from "brikko-studio/plugin-sdk/channel-lifecycle";
export {
  readStoreAllowFromForDmPolicy,
  resolveEffectiveAllowFromLists,
} from "brikko-studio/plugin-sdk/channel-policy";
export { resolveControlCommandGate } from "brikko-studio/plugin-sdk/command-auth";
export { dispatchInboundReplyWithBase } from "brikko-studio/plugin-sdk/inbound-reply-dispatch";
export { chunkTextForOutbound } from "brikko-studio/plugin-sdk/text-chunking";
export {
  deliverFormattedTextWithAttachments,
  formatTextWithAttachmentLinks,
  resolveOutboundMediaUrls,
} from "brikko-studio/plugin-sdk/reply-payload";
export {
  GROUP_POLICY_BLOCKED_LABEL,
  resolveAllowlistProviderRuntimeGroupPolicy,
  resolveDefaultGroupPolicy,
  warnMissingProviderGroupPolicyFallbackOnce,
} from "brikko-studio/plugin-sdk/runtime-group-policy";
export { isDangerousNameMatchingEnabled } from "brikko-studio/plugin-sdk/dangerous-name-runtime";
export { logInboundDrop } from "brikko-studio/plugin-sdk/channel-inbound";
