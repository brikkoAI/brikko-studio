// Private runtime barrel for the bundled Signal extension.
// Prefer narrower SDK subpaths plus local extension seams over the legacy signal barrel.

export type { ChannelMessageActionAdapter } from "brikko-studio/plugin-sdk/channel-contract";
export { buildChannelConfigSchema, SignalConfigSchema } from "../config-api.js";
export { PAIRING_APPROVED_MESSAGE } from "brikko-studio/plugin-sdk/channel-status";
import type { BrikkoStudioConfig as RuntimeBrikkoStudioConfig } from "brikko-studio/plugin-sdk/config-types";
export type { RuntimeBrikkoStudioConfig as BrikkoStudioConfig };
export type { BrikkoStudioPluginApi, PluginRuntime } from "brikko-studio/plugin-sdk/core";
export type { ChannelPlugin } from "brikko-studio/plugin-sdk/core";
export {
  DEFAULT_ACCOUNT_ID,
  applyAccountNameToChannelSection,
  deleteAccountFromConfigSection,
  emptyPluginConfigSchema,
  formatPairingApproveHint,
  getChatChannelMeta,
  migrateBaseNameToDefaultAccount,
  normalizeAccountId,
  setAccountEnabledInConfigSection,
} from "brikko-studio/plugin-sdk/core";
export { resolveChannelMediaMaxBytes } from "brikko-studio/plugin-sdk/media-runtime";
export { formatCliCommand, formatDocsLink } from "brikko-studio/plugin-sdk/setup-tools";
export { chunkText } from "brikko-studio/plugin-sdk/reply-runtime";
export { detectBinary } from "brikko-studio/plugin-sdk/setup-tools";
export {
  resolveAllowlistProviderRuntimeGroupPolicy,
  resolveDefaultGroupPolicy,
} from "brikko-studio/plugin-sdk/runtime-group-policy";
export {
  buildBaseAccountStatusSnapshot,
  buildBaseChannelStatusSummary,
  collectStatusIssuesFromLastError,
  createDefaultChannelRuntimeState,
} from "brikko-studio/plugin-sdk/status-helpers";
export { normalizeE164 } from "brikko-studio/plugin-sdk/text-runtime";
export { looksLikeSignalTargetId, normalizeSignalMessagingTarget } from "./normalize.js";
export {
  listEnabledSignalAccounts,
  listSignalAccountIds,
  resolveDefaultSignalAccountId,
  resolveSignalAccount,
} from "./accounts.js";
export { monitorSignalProvider } from "./monitor.js";
export { installSignalCli } from "./install-signal-cli.js";
export { probeSignal } from "./probe.js";
export { resolveSignalReactionLevel } from "./reaction-level.js";
export { removeReactionSignal, sendReactionSignal } from "./send-reactions.js";
export { sendMessageSignal } from "./send.js";
export { signalMessageActions } from "./message-actions.js";
export type { ResolvedSignalAccount } from "./accounts.js";
export type { SignalAccountConfig } from "./account-types.js";
