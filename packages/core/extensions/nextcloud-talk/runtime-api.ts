// Private runtime barrel for the bundled Nextcloud Talk extension.
// Keep this barrel thin and aligned with the local extension surface.

export type { AllowlistMatch } from "brikko-studio/plugin-sdk/allow-from";
export type { ChannelGroupContext } from "brikko-studio/plugin-sdk/channel-contract";
export { logInboundDrop } from "brikko-studio/plugin-sdk/channel-logging";
export { createChannelPairingController } from "brikko-studio/plugin-sdk/channel-pairing";
export {
  readStoreAllowFromForDmPolicy,
  resolveDmGroupAccessWithCommandGate,
} from "brikko-studio/plugin-sdk/channel-policy";
export type {
  BlockStreamingCoalesceConfig,
  DmConfig,
  DmPolicy,
  GroupPolicy,
  GroupToolPolicyConfig,
  BrikkoStudioConfig,
} from "brikko-studio/plugin-sdk/config-types";
export {
  GROUP_POLICY_BLOCKED_LABEL,
  resolveAllowlistProviderRuntimeGroupPolicy,
  resolveDefaultGroupPolicy,
  warnMissingProviderGroupPolicyFallbackOnce,
} from "brikko-studio/plugin-sdk/runtime-group-policy";
export { dispatchInboundReplyWithBase } from "brikko-studio/plugin-sdk/inbound-reply-dispatch";
export type { OutboundReplyPayload } from "brikko-studio/plugin-sdk/reply-payload";
export { deliverFormattedTextWithAttachments } from "brikko-studio/plugin-sdk/reply-payload";
export type { PluginRuntime } from "brikko-studio/plugin-sdk/runtime-store";
export type { RuntimeEnv } from "brikko-studio/plugin-sdk/runtime";
export type { SecretInput } from "brikko-studio/plugin-sdk/secret-input";
export { fetchWithSsrFGuard } from "brikko-studio/plugin-sdk/ssrf-runtime";
export { setNextcloudTalkRuntime } from "./src/runtime.js";
