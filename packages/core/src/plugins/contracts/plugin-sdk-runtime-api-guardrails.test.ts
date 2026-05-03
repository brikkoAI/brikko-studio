import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { bundledPluginFile, getBundledPluginRoots } from "./test-helpers/bundled-plugin-roots.js";

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const RUNTIME_API_EXPORT_GUARDS: Record<string, readonly string[]> = {
  [bundledPluginFile({ rootDir: ROOT_DIR, pluginId: "discord", relativePath: "runtime-api.ts" })]: [
    'export { discordMessageActions, handleDiscordAction, isDiscordModerationAction, readDiscordChannelCreateParams, readDiscordChannelEditParams, readDiscordChannelMoveParams, readDiscordModerationCommand, readDiscordParentIdParam, requiredGuildPermissionForModerationAction, type DiscordModerationAction, type DiscordModerationCommand } from "./runtime-api.actions.js";',
    'export { auditDiscordChannelPermissions, collectDiscordAuditChannelIds, fetchDiscordApplicationId, fetchDiscordApplicationSummary, listDiscordDirectoryGroupsLive, listDiscordDirectoryPeersLive, parseApplicationIdFromToken, probeDiscord, resolveDiscordChannelAllowlist, resolveDiscordPrivilegedIntentsFromFlags, resolveDiscordUserAllowlist, setDiscordRuntime, type DiscordApplicationSummary, type DiscordChannelResolution, type DiscordPrivilegedIntentsSummary, type DiscordPrivilegedIntentStatus, type DiscordProbe, type DiscordUserResolution } from "./runtime-api.lookup.js";',
    'export { DISCORD_ATTACHMENT_IDLE_TIMEOUT_MS, DISCORD_ATTACHMENT_TOTAL_TIMEOUT_MS, DISCORD_DEFAULT_INBOUND_WORKER_TIMEOUT_MS, DISCORD_DEFAULT_LISTENER_TIMEOUT_MS, allowListMatches, buildDiscordMediaPayload, clearGateways, clearPresences, createDiscordGatewayPlugin, createDiscordMessageHandler, createDiscordNativeCommand, getGateway, getPresence, isDiscordGroupAllowedByPolicy, mergeAbortSignals, monitorDiscordProvider, normalizeDiscordAllowList, normalizeDiscordSlug, presenceCacheSize, registerDiscordListener, registerGateway, resolveDiscordChannelConfig, resolveDiscordChannelConfigWithFallback, resolveDiscordCommandAuthorized, resolveDiscordGatewayIntents, resolveDiscordGuildEntry, resolveDiscordReplyTarget, resolveDiscordShouldRequireMention, resolveGroupDmAllow, sanitizeDiscordThreadName, setPresence, shouldEmitDiscordReactionNotification, unregisterGateway, waitForDiscordGatewayPluginRegistration, type DiscordAllowList, type DiscordChannelConfigResolved, type DiscordGuildEntryResolved, type DiscordMessageEvent, type DiscordMessageHandler, type MonitorDiscordOpts } from "./runtime-api.monitor.js";',
    'export { DiscordSendError, addRoleDiscord, banMemberDiscord, createChannelDiscord, createScheduledEventDiscord, createThreadDiscord, deleteChannelDiscord, deleteMessageDiscord, editChannelDiscord, editDiscordComponentMessage, editMessageDiscord, fetchChannelInfoDiscord, fetchChannelPermissionsDiscord, fetchMemberGuildPermissionsDiscord, fetchMemberInfoDiscord, fetchMessageDiscord, fetchReactionsDiscord, fetchRoleInfoDiscord, fetchVoiceStatusDiscord, hasAllGuildPermissionsDiscord, hasAnyGuildPermissionDiscord, kickMemberDiscord, listGuildChannelsDiscord, listGuildEmojisDiscord, listPinsDiscord, listScheduledEventsDiscord, listThreadsDiscord, moveChannelDiscord, pinMessageDiscord, reactMessageDiscord, readMessagesDiscord, registerBuiltDiscordComponentMessage, removeChannelPermissionDiscord, removeOwnReactionsDiscord, removeReactionDiscord, removeRoleDiscord, resolveDiscordOutboundSessionRoute, resolveEventCoverImage, searchMessagesDiscord, sendDiscordComponentMessage, sendMessageDiscord, sendPollDiscord, sendStickerDiscord, sendTypingDiscord, sendVoiceMessageDiscord, sendWebhookMessageDiscord, setChannelPermissionDiscord, timeoutMemberDiscord, unpinMessageDiscord, uploadEmojiDiscord, uploadStickerDiscord, type DiscordChannelCreate, type DiscordChannelEdit, type DiscordChannelMove, type DiscordChannelPermissionSet, type DiscordEmojiUpload, type DiscordMessageEdit, type DiscordMessageQuery, type DiscordModerationTarget, type DiscordPermissionsSummary, type DiscordReactionRuntimeContext, type DiscordReactionSummary, type DiscordReactionUser, type DiscordReactOpts, type DiscordRoleChange, type DiscordRuntimeAccountContext, type DiscordSearchQuery, type DiscordSendResult, type DiscordStickerUpload, type DiscordThreadCreate, type DiscordThreadList, type DiscordTimeoutTarget, type ResolveDiscordOutboundSessionRouteParams } from "./runtime-api.send.js";',
    'export { __testing, autoBindSpawnedDiscordSubagent, createNoopThreadBindingManager, createThreadBindingManager, formatThreadBindingDurationLabel, getThreadBindingManager, isRecentlyUnboundThreadWebhookMessage, listThreadBindingsBySessionKey, listThreadBindingsForAccount, reconcileAcpThreadBindingsOnStartup, resolveDiscordThreadBindingIdleTimeoutMs, resolveDiscordThreadBindingMaxAgeMs, resolveThreadBindingIdleTimeoutMs, resolveThreadBindingInactivityExpiresAt, resolveThreadBindingIntroText, resolveThreadBindingMaxAgeExpiresAt, resolveThreadBindingMaxAgeMs, resolveThreadBindingPersona, resolveThreadBindingPersonaFromRecord, resolveThreadBindingsEnabled, resolveThreadBindingThreadName, setThreadBindingIdleTimeoutBySessionKey, setThreadBindingMaxAgeBySessionKey, unbindThreadBindingsBySessionKey, type AcpThreadBindingReconciliationResult, type ThreadBindingManager, type ThreadBindingRecord, type ThreadBindingTargetKind } from "./runtime-api.threads.js";',
  ],
  [bundledPluginFile({ rootDir: ROOT_DIR, pluginId: "imessage", relativePath: "runtime-api.ts" })]:
    [
      'export { DEFAULT_ACCOUNT_ID, getChatChannelMeta, type ChannelPlugin } from "brikko-studio/plugin-sdk/core";',
      'export { buildChannelConfigSchema, IMessageConfigSchema } from "./config-api.js";',
      'export { PAIRING_APPROVED_MESSAGE } from "brikko-studio/plugin-sdk/channel-status";',
      'export { buildComputedAccountStatusSnapshot, collectStatusIssuesFromLastError } from "brikko-studio/plugin-sdk/status-helpers";',
      'export { formatTrimmedAllowFromEntries } from "brikko-studio/plugin-sdk/channel-config-helpers";',
      'export { resolveIMessageConfigAllowFrom, resolveIMessageConfigDefaultTo } from "./src/config-accessors.js";',
      'export { looksLikeIMessageTargetId, normalizeIMessageMessagingTarget } from "./src/normalize.js";',
      'export { resolveChannelMediaMaxBytes } from "brikko-studio/plugin-sdk/media-runtime";',
      'export { resolveIMessageGroupRequireMention, resolveIMessageGroupToolPolicy } from "./src/group-policy.js";',
      'export { monitorIMessageProvider } from "./src/monitor.js";',
      'export type { MonitorIMessageOpts } from "./src/monitor.js";',
      'export { probeIMessage } from "./src/probe.js";',
      'export type { IMessageProbe } from "./src/probe.js";',
      'export { sendMessageIMessage } from "./src/send.js";',
      'export { setIMessageRuntime } from "./src/runtime.js";',
      'export { chunkTextForOutbound } from "./src/channel-api.js";',
      'export type IMessageAccountConfig = Omit< NonNullable<NonNullable<RuntimeApiBrikkoStudioConfig["channels"]>["imessage"]>, "accounts" | "defaultAccount" >;',
    ],
  [bundledPluginFile({
    rootDir: ROOT_DIR,
    pluginId: "googlechat",
    relativePath: "runtime-api.ts",
  })]: [
    'export { DEFAULT_ACCOUNT_ID } from "brikko-studio/plugin-sdk/account-id";',
    'export { createActionGate, jsonResult, readNumberParam, readReactionParams, readStringParam } from "brikko-studio/plugin-sdk/channel-actions";',
    'export { buildChannelConfigSchema } from "brikko-studio/plugin-sdk/channel-config-primitives";',
    'export type { ChannelMessageActionAdapter, ChannelMessageActionName, ChannelStatusIssue } from "brikko-studio/plugin-sdk/channel-contract";',
    'export { missingTargetError } from "brikko-studio/plugin-sdk/channel-feedback";',
    'export { createAccountStatusSink, runPassiveAccountLifecycle } from "brikko-studio/plugin-sdk/channel-lifecycle";',
    'export { createChannelPairingController } from "brikko-studio/plugin-sdk/channel-pairing";',
    'export { createChannelReplyPipeline } from "brikko-studio/plugin-sdk/channel-reply-pipeline";',
    'export { evaluateGroupRouteAccessForPolicy, resolveDmGroupAccessWithLists, resolveSenderScopedGroupPolicy } from "brikko-studio/plugin-sdk/channel-policy";',
    'export { PAIRING_APPROVED_MESSAGE } from "brikko-studio/plugin-sdk/channel-status";',
    'export { chunkTextForOutbound } from "brikko-studio/plugin-sdk/text-chunking";',
    'export type { BrikkoStudioConfig } from "brikko-studio/plugin-sdk/config-types";',
    'export { GoogleChatConfigSchema } from "brikko-studio/plugin-sdk/bundled-channel-config-schema";',
    'export { GROUP_POLICY_BLOCKED_LABEL, resolveAllowlistProviderRuntimeGroupPolicy, resolveDefaultGroupPolicy, warnMissingProviderGroupPolicyFallbackOnce } from "brikko-studio/plugin-sdk/runtime-group-policy";',
    'export { isDangerousNameMatchingEnabled } from "brikko-studio/plugin-sdk/dangerous-name-runtime";',
    'export { fetchRemoteMedia, resolveChannelMediaMaxBytes } from "brikko-studio/plugin-sdk/media-runtime";',
    'export { loadOutboundMediaFromUrl } from "brikko-studio/plugin-sdk/outbound-media";',
    'export type { PluginRuntime } from "brikko-studio/plugin-sdk/runtime-store";',
    'export { fetchWithSsrFGuard } from "brikko-studio/plugin-sdk/ssrf-runtime";',
    'export type { GoogleChatAccountConfig, GoogleChatConfig } from "brikko-studio/plugin-sdk/config-types";',
    'export { extractToolSend } from "brikko-studio/plugin-sdk/tool-send";',
    'export { resolveInboundMentionDecision } from "brikko-studio/plugin-sdk/channel-inbound";',
    'export { resolveInboundRouteEnvelopeBuilderWithRuntime } from "brikko-studio/plugin-sdk/inbound-envelope";',
    'export { resolveWebhookPath } from "brikko-studio/plugin-sdk/webhook-path";',
    'export { registerWebhookTargetWithPluginRoute, resolveWebhookTargetWithAuthOrReject, withResolvedWebhookRequestPipeline } from "brikko-studio/plugin-sdk/webhook-targets";',
    'export { createWebhookInFlightLimiter, readJsonWebhookBodyOrReject, type WebhookInFlightLimiter } from "brikko-studio/plugin-sdk/webhook-request-guards";',
    'export { setGoogleChatRuntime } from "./src/runtime.js";',
  ],
  [bundledPluginFile({ rootDir: ROOT_DIR, pluginId: "msteams", relativePath: "runtime-api.ts" })]: [
    'export { DEFAULT_ACCOUNT_ID } from "brikko-studio/plugin-sdk/account-id";',
    'export type { AllowlistMatch } from "brikko-studio/plugin-sdk/allow-from";',
    'export { mergeAllowlist, resolveAllowlistMatchSimple, summarizeMapping } from "brikko-studio/plugin-sdk/allow-from";',
    'export type { BaseProbeResult, ChannelDirectoryEntry, ChannelGroupContext, ChannelMessageActionName, ChannelOutboundAdapter } from "brikko-studio/plugin-sdk/channel-contract";',
    'export type { ChannelPlugin } from "brikko-studio/plugin-sdk/channel-core";',
    'export { logTypingFailure } from "brikko-studio/plugin-sdk/channel-logging";',
    'export { createChannelPairingController } from "brikko-studio/plugin-sdk/channel-pairing";',
    'export { evaluateSenderGroupAccessForPolicy, readStoreAllowFromForDmPolicy, resolveDmGroupAccessWithLists, resolveEffectiveAllowFromLists, resolveSenderScopedGroupPolicy, resolveToolsBySender } from "brikko-studio/plugin-sdk/channel-policy";',
    'export { createChannelReplyPipeline } from "brikko-studio/plugin-sdk/channel-reply-pipeline";',
    'export { PAIRING_APPROVED_MESSAGE, buildProbeChannelStatusSummary, createDefaultChannelRuntimeState } from "brikko-studio/plugin-sdk/channel-status";',
    'export { buildChannelKeyCandidates, normalizeChannelSlug, resolveChannelEntryMatchWithFallback, resolveNestedAllowlistDecision } from "brikko-studio/plugin-sdk/channel-targets";',
    'export type { GroupPolicy, GroupToolPolicyConfig, MSTeamsChannelConfig, MSTeamsConfig, MSTeamsReplyStyle, MSTeamsTeamConfig, MarkdownTableMode, BrikkoStudioConfig } from "brikko-studio/plugin-sdk/config-types";',
    'export { isDangerousNameMatchingEnabled } from "brikko-studio/plugin-sdk/dangerous-name-runtime";',
    'export { resolveDefaultGroupPolicy } from "brikko-studio/plugin-sdk/runtime-group-policy";',
    'export { withFileLock } from "brikko-studio/plugin-sdk/file-lock";',
    'export { keepHttpServerTaskAlive } from "brikko-studio/plugin-sdk/channel-lifecycle";',
    'export { detectMime, extensionForMime, extractOriginalFilename, getFileExtension, resolveChannelMediaMaxBytes } from "brikko-studio/plugin-sdk/media-runtime";',
    'export { dispatchReplyFromConfigWithSettledDispatcher } from "brikko-studio/plugin-sdk/inbound-reply-dispatch";',
    'export { loadOutboundMediaFromUrl } from "brikko-studio/plugin-sdk/outbound-media";',
    'export { buildMediaPayload } from "brikko-studio/plugin-sdk/reply-payload";',
    'export type { ReplyPayload } from "brikko-studio/plugin-sdk/reply-payload";',
    'export type { PluginRuntime } from "brikko-studio/plugin-sdk/runtime-store";',
    'export type { RuntimeEnv } from "brikko-studio/plugin-sdk/runtime";',
    'export type { SsrFPolicy } from "brikko-studio/plugin-sdk/ssrf-runtime";',
    'export { fetchWithSsrFGuard } from "brikko-studio/plugin-sdk/ssrf-runtime";',
    'export { normalizeStringEntries } from "brikko-studio/plugin-sdk/string-normalization-runtime";',
    'export { chunkTextForOutbound } from "brikko-studio/plugin-sdk/text-chunking";',
    'export { DEFAULT_WEBHOOK_MAX_BODY_BYTES } from "brikko-studio/plugin-sdk/webhook-ingress";',
    'export { setMSTeamsRuntime } from "./src/runtime.js";',
  ],
  [bundledPluginFile({ rootDir: ROOT_DIR, pluginId: "irc", relativePath: "runtime-api.ts" })]: [
    'export { setIrcRuntime } from "./src/runtime.js";',
  ],
  [bundledPluginFile({ rootDir: ROOT_DIR, pluginId: "matrix", relativePath: "runtime-api.ts" })]: [
    'export { type MatrixResolvedStringField, type MatrixResolvedStringValues, resolveMatrixAccountStringValues } from "./src/auth-precedence.js";',
    'export { requiresExplicitMatrixDefaultAccount, resolveMatrixDefaultOrOnlyAccountId } from "./src/account-selection.js";',
    'export { findMatrixAccountEntry, resolveConfiguredMatrixAccountIds, resolveMatrixChannelConfig } from "./src/account-selection.js";',
    'export { getMatrixScopedEnvVarNames, listMatrixEnvAccountIds, resolveMatrixEnvAccountToken } from "./src/env-vars.js";',
    'export { hashMatrixAccessToken, resolveMatrixAccountStorageRoot, resolveMatrixCredentialsDir, resolveMatrixCredentialsFilename, resolveMatrixCredentialsPath, resolveMatrixHomeserverKey, resolveMatrixLegacyFlatStoragePaths, resolveMatrixLegacyFlatStoreRoot, sanitizeMatrixPathSegment } from "./src/storage-paths.js";',
    'export { ensureMatrixSdkInstalled, isMatrixSdkAvailable } from "./src/matrix/deps.js";',
    'export { assertHttpUrlTargetsPrivateNetwork, closeDispatcher, createPinnedDispatcher, resolvePinnedHostnameWithPolicy, ssrfPolicyFromDangerouslyAllowPrivateNetwork, ssrfPolicyFromAllowPrivateNetwork, type LookupFn, type SsrFPolicy } from "brikko-studio/plugin-sdk/ssrf-runtime";',
    'export { setMatrixThreadBindingIdleTimeoutBySessionKey, setMatrixThreadBindingMaxAgeBySessionKey } from "./src/matrix/thread-bindings-shared.js";',
    'export { setMatrixRuntime } from "./src/runtime.js";',
    'export { writeJsonFileAtomically } from "brikko-studio/plugin-sdk/json-store";',
    'export type { ChannelDirectoryEntry, ChannelMessageActionContext } from "brikko-studio/plugin-sdk/channel-contract";',
    'export type { BrikkoStudioConfig } from "brikko-studio/plugin-sdk/config-types";',
    'export { formatZonedTimestamp } from "brikko-studio/plugin-sdk/time-runtime";',
    'export type { PluginRuntime, RuntimeLogger } from "brikko-studio/plugin-sdk/plugin-runtime";',
    'export type { RuntimeEnv } from "brikko-studio/plugin-sdk/runtime-env";',
    'export type { WizardPrompter } from "brikko-studio/plugin-sdk/setup";',
    'export function chunkTextForOutbound(text: string, limit: number): string[] { const chunks: string[] = []; let remaining = text; while (remaining.length > limit) { const window = remaining.slice(0, limit); const splitAt = Math.max(window.lastIndexOf("\\n"), window.lastIndexOf(" ")); const breakAt = splitAt > 0 ? splitAt : limit; chunks.push(remaining.slice(0, breakAt).trimEnd()); remaining = remaining.slice(breakAt).trimStart(); } if (remaining.length > 0 || text.length === 0) { chunks.push(remaining); } return chunks; }',
  ],
  [bundledPluginFile({
    rootDir: ROOT_DIR,
    pluginId: "nextcloud-talk",
    relativePath: "runtime-api.ts",
  })]: [
    'export type { AllowlistMatch } from "brikko-studio/plugin-sdk/allow-from";',
    'export type { ChannelGroupContext } from "brikko-studio/plugin-sdk/channel-contract";',
    'export { logInboundDrop } from "brikko-studio/plugin-sdk/channel-logging";',
    'export { createChannelPairingController } from "brikko-studio/plugin-sdk/channel-pairing";',
    'export { readStoreAllowFromForDmPolicy, resolveDmGroupAccessWithCommandGate } from "brikko-studio/plugin-sdk/channel-policy";',
    'export type { BlockStreamingCoalesceConfig, DmConfig, DmPolicy, GroupPolicy, GroupToolPolicyConfig, BrikkoStudioConfig } from "brikko-studio/plugin-sdk/config-types";',
    'export { GROUP_POLICY_BLOCKED_LABEL, resolveAllowlistProviderRuntimeGroupPolicy, resolveDefaultGroupPolicy, warnMissingProviderGroupPolicyFallbackOnce } from "brikko-studio/plugin-sdk/runtime-group-policy";',
    'export { dispatchInboundReplyWithBase } from "brikko-studio/plugin-sdk/inbound-reply-dispatch";',
    'export type { OutboundReplyPayload } from "brikko-studio/plugin-sdk/reply-payload";',
    'export { deliverFormattedTextWithAttachments } from "brikko-studio/plugin-sdk/reply-payload";',
    'export type { PluginRuntime } from "brikko-studio/plugin-sdk/runtime-store";',
    'export type { RuntimeEnv } from "brikko-studio/plugin-sdk/runtime";',
    'export type { SecretInput } from "brikko-studio/plugin-sdk/secret-input";',
    'export { fetchWithSsrFGuard } from "brikko-studio/plugin-sdk/ssrf-runtime";',
    'export { setNextcloudTalkRuntime } from "./src/runtime.js";',
  ],
  [bundledPluginFile({ rootDir: ROOT_DIR, pluginId: "nostr", relativePath: "runtime-api.ts" })]: [
    'export type { BrikkoStudioConfig } from "brikko-studio/plugin-sdk/config-types";',
    'export { getPluginRuntimeGatewayRequestScope } from "brikko-studio/plugin-sdk/plugin-runtime";',
    'export type { PluginRuntime } from "brikko-studio/plugin-sdk/runtime-store";',
  ],
  [bundledPluginFile({ rootDir: ROOT_DIR, pluginId: "signal", relativePath: "runtime-api.ts" })]: [
    'export { applyAccountNameToChannelSection, buildBaseAccountStatusSnapshot, buildBaseChannelStatusSummary, buildChannelConfigSchema, type ChannelMessageActionAdapter, type ChannelPlugin, chunkText, collectStatusIssuesFromLastError, createDefaultChannelRuntimeState, DEFAULT_ACCOUNT_ID, deleteAccountFromConfigSection, detectBinary, emptyPluginConfigSchema, formatCliCommand, formatDocsLink, formatPairingApproveHint, getChatChannelMeta, installSignalCli, listEnabledSignalAccounts, listSignalAccountIds, looksLikeSignalTargetId, migrateBaseNameToDefaultAccount, monitorSignalProvider, normalizeAccountId, normalizeE164, normalizeSignalMessagingTarget, type BrikkoStudioConfig, type BrikkoStudioPluginApi, PAIRING_APPROVED_MESSAGE, type PluginRuntime, probeSignal, removeReactionSignal, resolveAllowlistProviderRuntimeGroupPolicy, resolveChannelMediaMaxBytes, resolveDefaultGroupPolicy, resolveDefaultSignalAccountId, type ResolvedSignalAccount, resolveSignalAccount, resolveSignalReactionLevel, sendMessageSignal, sendReactionSignal, setAccountEnabledInConfigSection, type SignalAccountConfig, SignalConfigSchema, signalMessageActions } from "./src/runtime-api.js";',
    'export { setSignalRuntime } from "./src/runtime.js";',
  ],
  [bundledPluginFile({ rootDir: ROOT_DIR, pluginId: "slack", relativePath: "runtime-api.ts" })]: [
    'export { handleSlackAction, slackActionRuntime, type SlackActionContext } from "./src/action-runtime.js";',
    'export { listSlackDirectoryGroupsLive, listSlackDirectoryPeersLive } from "./src/directory-live.js";',
    'export { deleteSlackMessage, editSlackMessage, getSlackMemberInfo, listEnabledSlackAccounts, listSlackAccountIds, listSlackEmojis, listSlackPins, listSlackReactions, monitorSlackProvider, pinSlackMessage, probeSlack, reactSlackMessage, readSlackMessages, removeOwnSlackReactions, removeSlackReaction, resolveDefaultSlackAccountId, resolveSlackAccount, resolveSlackAppToken, resolveSlackBotToken, resolveSlackGroupRequireMention, resolveSlackGroupToolPolicy, sendMessageSlack, sendSlackMessage, unpinSlackMessage } from "./src/index.js";',
    'export { resolveSlackChannelAllowlist, type SlackChannelLookup, type SlackChannelResolution } from "./src/resolve-channels.js";',
    'export { resolveSlackUserAllowlist, type SlackUserLookup, type SlackUserResolution } from "./src/resolve-users.js";',
    'export { registerSlackPluginHttpRoutes } from "./src/http/plugin-routes.js";',
    'export { setSlackRuntime } from "./src/runtime.js";',
  ],
  [bundledPluginFile({ rootDir: ROOT_DIR, pluginId: "telegram", relativePath: "runtime-api.ts" })]:
    [
      'export type { BrikkoStudioPluginApi } from "brikko-studio/plugin-sdk/plugin-entry";',
      'export type { ChannelMessageActionAdapter } from "brikko-studio/plugin-sdk/channel-contract";',
      'export type { TelegramApiOverride } from "./src/send.js";',
      'export type { BrikkoStudioPluginService, BrikkoStudioPluginServiceContext, PluginLogger } from "brikko-studio/plugin-sdk/plugin-entry";',
      'export type { PluginRuntime } from "brikko-studio/plugin-sdk/runtime-store";',
      'export type { AcpRuntime, AcpRuntimeCapabilities, AcpRuntimeDoctorReport, AcpRuntimeEnsureInput, AcpRuntimeEvent, AcpRuntimeHandle, AcpRuntimeStatus, AcpRuntimeTurnInput, AcpRuntimeErrorCode, AcpSessionUpdateTag } from "brikko-studio/plugin-sdk/acp-runtime";',
      'export { AcpRuntimeError } from "brikko-studio/plugin-sdk/acp-runtime";',
      'export { emptyPluginConfigSchema, formatPairingApproveHint, getChatChannelMeta } from "brikko-studio/plugin-sdk/channel-plugin-common";',
      'export { clearAccountEntryFields } from "brikko-studio/plugin-sdk/channel-core";',
      'export { buildChannelConfigSchema, TelegramConfigSchema } from "./config-api.js";',
      'export { DEFAULT_ACCOUNT_ID, normalizeAccountId } from "brikko-studio/plugin-sdk/account-id";',
      'export { PAIRING_APPROVED_MESSAGE, buildTokenChannelStatusSummary, projectCredentialSnapshotFields, resolveConfiguredFromCredentialStatuses } from "brikko-studio/plugin-sdk/channel-status";',
      'export { jsonResult, readNumberParam, readReactionParams, readStringArrayParam, readStringOrNumberParam, readStringParam, resolvePollMaxSelections } from "brikko-studio/plugin-sdk/channel-actions";',
      'export type { TelegramProbe } from "./src/probe.js";',
      'export { auditTelegramGroupMembership, collectTelegramUnmentionedGroupIds } from "./src/audit.js";',
      'export { resolveTelegramRuntimeGroupPolicy } from "./src/group-access.js";',
      'export { buildTelegramExecApprovalPendingPayload, shouldSuppressTelegramExecApprovalForwardingFallback } from "./src/exec-approval-forwarding.js";',
      'export { telegramMessageActions } from "./src/channel-actions.js";',
      'export { monitorTelegramProvider } from "./src/monitor.js";',
      'export { probeTelegram } from "./src/probe.js";',
      'export { resolveTelegramFetch, resolveTelegramTransport, shouldRetryTelegramTransportFallback } from "./src/fetch.js";',
      'export { makeProxyFetch } from "./src/proxy.js";',
      'export { createForumTopicTelegram, deleteMessageTelegram, editForumTopicTelegram, editMessageReplyMarkupTelegram, editMessageTelegram, pinMessageTelegram, reactMessageTelegram, renameForumTopicTelegram, sendMessageTelegram, sendPollTelegram, sendStickerTelegram, sendTypingTelegram, unpinMessageTelegram } from "./src/send.js";',
      'export { createTelegramThreadBindingManager, getTelegramThreadBindingManager, resetTelegramThreadBindingsForTests, setTelegramThreadBindingIdleTimeoutBySessionKey, setTelegramThreadBindingMaxAgeBySessionKey } from "./src/thread-bindings.js";',
      'export { resolveTelegramToken } from "./src/token.js";',
      'export { setTelegramRuntime } from "./src/runtime.js";',
      'export type { ChannelPlugin } from "brikko-studio/plugin-sdk/channel-core";',
      'export type { BrikkoStudioConfig } from "brikko-studio/plugin-sdk/config-types";',
      'export type TelegramAccountConfig = NonNullable< NonNullable<RuntimeBrikkoStudioConfig["channels"]>["telegram"] >;',
      'export type TelegramActionConfig = NonNullable<TelegramAccountConfig["actions"]>;',
      'export type TelegramNetworkConfig = NonNullable<TelegramAccountConfig["network"]>;',
      'export { parseTelegramTopicConversation } from "./src/topic-conversation.js";',
      'export { resolveTelegramPollVisibility } from "./src/poll-visibility.js";',
    ],
  [bundledPluginFile({ rootDir: ROOT_DIR, pluginId: "twitch", relativePath: "runtime-api.ts" })]: [
    'export type { ChannelAccountSnapshot, ChannelCapabilities, ChannelGatewayContext, ChannelLogSink, ChannelMessageActionAdapter, ChannelMessageActionContext, ChannelMeta, ChannelOutboundAdapter, ChannelOutboundContext, ChannelResolveKind, ChannelResolveResult, ChannelStatusAdapter } from "brikko-studio/plugin-sdk/channel-contract";',
    'export type { ChannelPlugin } from "brikko-studio/plugin-sdk/channel-core";',
    'export type { OutboundDeliveryResult } from "brikko-studio/plugin-sdk/channel-send-result";',
    'export type { BrikkoStudioConfig } from "brikko-studio/plugin-sdk/config-types";',
    'export type { RuntimeEnv } from "brikko-studio/plugin-sdk/runtime";',
    'export type { WizardPrompter } from "brikko-studio/plugin-sdk/setup";',
  ],
  [bundledPluginFile({
    rootDir: ROOT_DIR,
    pluginId: "voice-call",
    relativePath: "runtime-api.ts",
  })]: [
    'export { definePluginEntry } from "brikko-studio/plugin-sdk/plugin-entry";',
    'export type { BrikkoStudioPluginApi } from "brikko-studio/plugin-sdk/plugin-entry";',
    'export type { GatewayRequestHandlerOptions } from "brikko-studio/plugin-sdk/gateway-runtime";',
    'export { isRequestBodyLimitError, readRequestBodyWithLimit, requestBodyErrorToText } from "brikko-studio/plugin-sdk/webhook-request-guards";',
    'export { fetchWithSsrFGuard, isBlockedHostnameOrIp } from "brikko-studio/plugin-sdk/ssrf-runtime";',
    'export type { SessionEntry } from "brikko-studio/plugin-sdk/session-store-runtime";',
    'export { TtsAutoSchema, TtsConfigSchema, TtsModeSchema, TtsProviderSchema } from "brikko-studio/plugin-sdk/tts-runtime";',
    'export { sleep } from "brikko-studio/plugin-sdk/runtime-env";',
  ],
  [bundledPluginFile({ rootDir: ROOT_DIR, pluginId: "whatsapp", relativePath: "runtime-api.ts" })]:
    [
      'export { getActiveWebListener, resolveWebAccountId, type ActiveWebListener, type ActiveWebSendOptions } from "./src/active-listener.js";',
      'export { handleWhatsAppAction, whatsAppActionRuntime } from "./src/action-runtime.js";',
      'export { createWhatsAppLoginTool } from "./src/agent-tools-login.js";',
      'export { formatWhatsAppWebAuthStatusState, getWebAuthAgeMs, hasWebCredsSync, logWebSelfId, logoutWeb, pickWebChannel, readCredsJsonRaw, readWebAuthExistsBestEffort, readWebAuthExistsForDecision, readWebAuthSnapshot, readWebAuthSnapshotBestEffort, readWebAuthState, readWebSelfId, readWebSelfIdentity, readWebSelfIdentityForDecision, resolveDefaultWebAuthDir, resolveWebCredsBackupPath, resolveWebCredsPath, restoreCredsFromBackupIfNeeded, WA_WEB_AUTH_DIR, webAuthExists, WHATSAPP_AUTH_UNSTABLE_CODE, WhatsAppAuthUnstableError, type WhatsAppWebAuthState } from "./src/auth-store.js";',
      'export { DEFAULT_WEB_MEDIA_BYTES, HEARTBEAT_PROMPT, HEARTBEAT_TOKEN, monitorWebChannel, SILENT_REPLY_TOKEN, stripHeartbeatToken, type WebChannelStatus, type WebMonitorTuning } from "./src/auto-reply.js";',
      'export { extractContactContext, extractLocationData, extractMediaPlaceholder, extractText, monitorWebInbox, resetWebInboundDedupe, type WebInboundMessage, type WebListenerCloseReason } from "./src/inbound.js";',
      'export { loginWeb } from "./src/login.js";',
      'export { getDefaultLocalRoots, loadWebMedia, loadWebMediaRaw, LocalMediaAccessError, optimizeImageToJpeg, optimizeImageToPng, type LocalMediaAccessErrorCode, type WebMediaResult } from "./src/media.js";',
      'export { sendMessageWhatsApp, sendPollWhatsApp, sendReactionWhatsApp, sendTypingWhatsApp } from "./src/send.js";',
      'export { createWaSocket, formatError, getStatusCode, newConnectionId, waitForCredsSaveQueue, waitForCredsSaveQueueWithTimeout, waitForWaConnection, writeCredsJsonAtomically, type CredsQueueWaitResult } from "./src/session.js";',
      'export { setWhatsAppRuntime } from "./src/runtime.js";',
      'export { startWebLoginWithQr, waitForWebLogin } from "./login-qr-runtime.js";',
    ],
} as const;

function collectRuntimeApiFiles(): string[] {
  return [...getBundledPluginRoots().entries()]
    .filter(([, rootDir]) => existsSync(resolve(rootDir, "runtime-api.ts")))
    .map(([pluginId]) =>
      bundledPluginFile({
        rootDir: ROOT_DIR,
        pluginId,
        relativePath: "runtime-api.ts",
      }),
    );
}

function readExportStatements(path: string): string[] {
  const sourceText = readFileSync(resolve(ROOT_DIR, "..", path), "utf8");
  const sourceFile = ts.createSourceFile(path, sourceText, ts.ScriptTarget.Latest, true);

  return sourceFile.statements.flatMap((statement) => {
    if (!ts.isExportDeclaration(statement)) {
      const modifiers = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) : undefined;
      if (!modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) {
        return [];
      }
      return [statement.getText(sourceFile).replaceAll(/\s+/g, " ").trim()];
    }

    const moduleSpecifier = statement.moduleSpecifier;
    if (!moduleSpecifier || !ts.isStringLiteral(moduleSpecifier)) {
      return [statement.getText(sourceFile).replaceAll(/\s+/g, " ").trim()];
    }

    if (!statement.exportClause) {
      const prefix = statement.isTypeOnly ? "export type *" : "export *";
      return [`${prefix} from ${moduleSpecifier.getText(sourceFile)};`];
    }

    if (!ts.isNamedExports(statement.exportClause)) {
      return [statement.getText(sourceFile).replaceAll(/\s+/g, " ").trim()];
    }

    const specifiers = statement.exportClause.elements.map((element) => {
      const imported = element.propertyName?.text;
      const exported = element.name.text;
      const alias = imported ? `${imported} as ${exported}` : exported;
      return element.isTypeOnly ? `type ${alias}` : alias;
    });
    const exportPrefix = statement.isTypeOnly ? "export type" : "export";
    return [
      `${exportPrefix} { ${specifiers.join(", ")} } from ${moduleSpecifier.getText(sourceFile)};`,
    ];
  });
}

describe("runtime api guardrails", () => {
  it("keeps runtime api surfaces on an explicit export allowlist", () => {
    const runtimeApiFiles = collectRuntimeApiFiles();
    expect(runtimeApiFiles).toEqual(
      expect.arrayContaining(Object.keys(RUNTIME_API_EXPORT_GUARDS).toSorted()),
    );

    for (const file of Object.keys(RUNTIME_API_EXPORT_GUARDS).toSorted()) {
      expect(readExportStatements(file), `${file} runtime api exports changed`).toEqual(
        RUNTIME_API_EXPORT_GUARDS[file],
      );
    }
  });

  it("keeps bundled runtime api barrels off their own branded sdk facades", () => {
    for (const [pluginId, rootDir] of getBundledPluginRoots().entries()) {
      const path = resolve(rootDir, "runtime-api.ts");
      if (!existsSync(path)) {
        continue;
      }
      const source = readFileSync(path, "utf8");
      expect(
        source,
        `${pluginId} runtime api should use generic sdk subpaths or local exports`,
      ).not.toContain(`"brikko-studio/plugin-sdk/${pluginId}"`);
      expect(
        source,
        `${pluginId} runtime api should use generic sdk subpaths or local exports`,
      ).not.toContain(`'brikko-studio/plugin-sdk/${pluginId}'`);
    }
  });

  it("keeps Slack's narrow runtime-setter entrypoint pinned to a single export", () => {
    // Regression for #69317. The bundled channel entry's runtime.specifier
    // now points at runtime-setter-api.ts. The whole point of that file is
    // to expose ONLY setSlackRuntime so that register() does not pay the
    // cost of importing the full runtime-api barrel. If a future change
    // re-broadens this file, this test fails so the perf regression is
    // surfaced explicitly rather than silently re-introduced.
    const setterFile = bundledPluginFile({
      rootDir: ROOT_DIR,
      pluginId: "slack",
      relativePath: "runtime-setter-api.ts",
    });
    expect(readExportStatements(setterFile)).toEqual([
      'export { setSlackRuntime } from "./src/runtime.js";',
    ]);
  });

  it("keeps Matrix's narrow runtime-setter entrypoint pinned to a single export", () => {
    const setterFile = bundledPluginFile({
      rootDir: ROOT_DIR,
      pluginId: "matrix",
      relativePath: "runtime-setter-api.ts",
    });
    expect(readExportStatements(setterFile)).toEqual([
      'export { setMatrixRuntime } from "./src/runtime.js";',
    ]);
  });
});
