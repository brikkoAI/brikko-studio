import type { BrikkoStudioConfig } from "../config/types.brikko-studio.js";
import { emptyPluginConfigSchema } from "../plugins/config-schema.js";
import type { ProviderRuntimeModel } from "../plugins/provider-runtime-model.types.js";
import type {
  AnyAgentTool,
  AgentHarness,
  MediaUnderstandingProviderPlugin,
  MigrationApplyResult,
  MigrationDetection,
  MigrationItem,
  MigrationPlan,
  MigrationProviderContext,
  MigrationProviderPlugin,
  MigrationSummary,
  BrikkoStudioPluginApi,
  BrikkoStudioPluginCommandDefinition,
  BrikkoStudioPluginConfigSchema,
  BrikkoStudioPluginDefinition,
  BrikkoStudioPluginHttpRouteHandler,
  BrikkoStudioPluginNodeHostCommand,
  BrikkoStudioPluginNodeInvokePolicy,
  BrikkoStudioPluginNodeInvokePolicyContext,
  BrikkoStudioPluginNodeInvokePolicyResult,
  BrikkoStudioPluginReloadRegistration,
  BrikkoStudioPluginSecurityAuditCollector,
  BrikkoStudioPluginSecurityAuditContext,
  BrikkoStudioPluginService,
  BrikkoStudioPluginServiceContext,
  BrikkoStudioPluginToolContext,
  BrikkoStudioPluginToolFactory,
  PluginLogger,
  ProviderAugmentModelCatalogContext,
  ProviderAuthContext,
  ProviderAuthDoctorHintContext,
  ProviderAuthMethod,
  ProviderAuthMethodNonInteractiveContext,
  ProviderAuthResult,
  ProviderApplyConfigDefaultsContext,
  ProviderBuildMissingAuthMessageContext,
  ProviderBuildUnknownModelHintContext,
  ProviderBuiltInModelSuppressionContext,
  ProviderBuiltInModelSuppressionResult,
  ProviderCacheTtlEligibilityContext,
  ProviderCatalogContext,
  ProviderCatalogResult,
  ProviderDeferSyntheticProfileAuthContext,
  ProviderDefaultThinkingPolicyContext,
  ProviderDiscoveryContext,
  ProviderFailoverErrorContext,
  ProviderFetchUsageSnapshotContext,
  ProviderModernModelPolicyContext,
  ProviderNormalizeConfigContext,
  ProviderNormalizeToolSchemasContext,
  ProviderNormalizeTransportContext,
  ProviderResolveConfigApiKeyContext,
  ProviderNormalizeModelIdContext,
  ProviderNormalizeResolvedModelContext,
  ProviderPrepareDynamicModelContext,
  ProviderPrepareExtraParamsContext,
  ProviderPrepareRuntimeAuthContext,
  ProviderPreparedRuntimeAuth,
  ProviderReasoningOutputMode,
  ProviderReasoningOutputModeContext,
  ProviderReplayPolicy,
  ProviderReplayPolicyContext,
  ProviderReplaySessionEntry,
  ProviderReplaySessionState,
  RealtimeTranscriptionProviderPlugin,
  ProviderResolvedUsageAuth,
  ProviderResolveDynamicModelContext,
  ProviderResolveTransportTurnStateContext,
  ProviderResolveWebSocketSessionPolicyContext,
  ProviderSanitizeReplayHistoryContext,
  ProviderTransportTurnState,
  ProviderToolSchemaDiagnostic,
  ProviderResolveUsageAuthContext,
  ProviderThinkingProfile,
  ProviderThinkingPolicyContext,
  ProviderValidateReplayTurnsContext,
  ProviderWebSocketSessionPolicy,
  ProviderWrapStreamFnContext,
  BrikkoStudioGatewayDiscoveryAdvertiseContext,
  BrikkoStudioGatewayDiscoveryService,
  SpeechProviderPlugin,
  PluginCommandContext,
  PluginCommandResult,
  PluginAgentEventSubscriptionRegistration,
  PluginAgentTurnPrepareEvent,
  PluginAgentTurnPrepareResult,
  PluginControlUiDescriptor,
  PluginHeartbeatPromptContributionEvent,
  PluginHeartbeatPromptContributionResult,
  PluginJsonValue,
  PluginNextTurnInjection,
  PluginNextTurnInjectionEnqueueResult,
  PluginNextTurnInjectionRecord,
  PluginRunContextGetParams,
  PluginRunContextPatch,
  PluginRuntimeLifecycleRegistration,
  PluginSessionSchedulerJobHandle,
  PluginSessionSchedulerJobRegistration,
  PluginSessionExtensionRegistration,
  PluginSessionExtensionProjection,
  PluginToolMetadataRegistration,
  PluginTrustedToolPolicyRegistration,
} from "../plugins/types.js";
import { createCachedLazyValueGetter } from "./lazy-value.js";

export type {
  AnyAgentTool,
  AgentHarness,
  MediaUnderstandingProviderPlugin,
  MigrationApplyResult,
  MigrationDetection,
  MigrationItem,
  MigrationPlan,
  MigrationProviderContext,
  MigrationProviderPlugin,
  MigrationSummary,
  BrikkoStudioPluginApi,
  BrikkoStudioPluginNodeHostCommand,
  BrikkoStudioPluginNodeInvokePolicy,
  BrikkoStudioPluginNodeInvokePolicyContext,
  BrikkoStudioPluginNodeInvokePolicyResult,
  BrikkoStudioPluginReloadRegistration,
  BrikkoStudioPluginSecurityAuditCollector,
  BrikkoStudioPluginSecurityAuditContext,
  BrikkoStudioPluginToolContext,
  BrikkoStudioPluginToolFactory,
  PluginCommandContext,
  PluginCommandResult,
  PluginAgentEventSubscriptionRegistration,
  PluginAgentTurnPrepareEvent,
  PluginAgentTurnPrepareResult,
  PluginControlUiDescriptor,
  PluginHeartbeatPromptContributionEvent,
  PluginHeartbeatPromptContributionResult,
  PluginJsonValue,
  PluginNextTurnInjection,
  PluginNextTurnInjectionEnqueueResult,
  PluginNextTurnInjectionRecord,
  PluginRunContextGetParams,
  PluginRunContextPatch,
  PluginRuntimeLifecycleRegistration,
  PluginSessionSchedulerJobHandle,
  PluginSessionSchedulerJobRegistration,
  PluginSessionExtensionRegistration,
  PluginSessionExtensionProjection,
  PluginToolMetadataRegistration,
  PluginTrustedToolPolicyRegistration,
  BrikkoStudioPluginConfigSchema,
  BrikkoStudioPluginHttpRouteHandler,
  ProviderDiscoveryContext,
  ProviderCatalogContext,
  ProviderCatalogResult,
  ProviderDeferSyntheticProfileAuthContext,
  ProviderAugmentModelCatalogContext,
  ProviderApplyConfigDefaultsContext,
  ProviderBuiltInModelSuppressionContext,
  ProviderBuiltInModelSuppressionResult,
  ProviderBuildMissingAuthMessageContext,
  ProviderBuildUnknownModelHintContext,
  ProviderCacheTtlEligibilityContext,
  ProviderDefaultThinkingPolicyContext,
  ProviderFetchUsageSnapshotContext,
  ProviderFailoverErrorContext,
  ProviderModernModelPolicyContext,
  ProviderNormalizeConfigContext,
  ProviderNormalizeToolSchemasContext,
  ProviderNormalizeTransportContext,
  ProviderResolveConfigApiKeyContext,
  ProviderNormalizeModelIdContext,
  ProviderReplayPolicy,
  ProviderReplayPolicyContext,
  ProviderReplaySessionEntry,
  ProviderReplaySessionState,
  ProviderPreparedRuntimeAuth,
  ProviderReasoningOutputMode,
  ProviderReasoningOutputModeContext,
  ProviderResolvedUsageAuth,
  ProviderToolSchemaDiagnostic,
  ProviderPrepareExtraParamsContext,
  ProviderPrepareDynamicModelContext,
  ProviderPrepareRuntimeAuthContext,
  ProviderSanitizeReplayHistoryContext,
  ProviderResolveUsageAuthContext,
  ProviderThinkingProfile,
  ProviderResolveDynamicModelContext,
  ProviderResolveTransportTurnStateContext,
  ProviderResolveWebSocketSessionPolicyContext,
  ProviderNormalizeResolvedModelContext,
  RealtimeTranscriptionProviderPlugin,
  ProviderTransportTurnState,
  SpeechProviderPlugin,
  ProviderThinkingPolicyContext,
  ProviderValidateReplayTurnsContext,
  ProviderWebSocketSessionPolicy,
  ProviderWrapStreamFnContext,
  BrikkoStudioGatewayDiscoveryAdvertiseContext,
  BrikkoStudioGatewayDiscoveryService,
  BrikkoStudioPluginService,
  BrikkoStudioPluginServiceContext,
  ProviderAuthContext,
  ProviderAuthDoctorHintContext,
  ProviderAuthMethodNonInteractiveContext,
  ProviderAuthMethod,
  ProviderAuthResult,
  BrikkoStudioPluginCommandDefinition,
  BrikkoStudioPluginDefinition,
  PluginLogger,
};
export type {
  PluginConversationBinding,
  PluginConversationBindingResolvedEvent,
  PluginConversationBindingRequestParams,
  PluginConversationBindingRequestResult,
} from "../plugins/conversation-binding.types.js";
export type {
  PluginHookInboundClaimContext,
  PluginHookInboundClaimEvent,
  PluginHookInboundClaimResult,
} from "../plugins/hook-types.js";
export type { ProviderRuntimeModel } from "../plugins/provider-runtime-model.types.js";
export type { BrikkoStudioConfig };

export {
  buildJsonPluginConfigSchema,
  buildPluginConfigSchema,
  emptyPluginConfigSchema,
} from "../plugins/config-schema.js";

/** Options for a plugin entry that registers providers, tools, commands, or services. */
type DefinePluginEntryOptions = {
  id: string;
  name: string;
  description: string;
  /**
   * @deprecated Declare exclusive plugin kind in `brikko-studio.plugin.json` via
   * manifest `kind`. Runtime-entry `kind` remains only as a compatibility
   * fallback for older plugins.
   */
  kind?: BrikkoStudioPluginDefinition["kind"];
  configSchema?: BrikkoStudioPluginConfigSchema | (() => BrikkoStudioPluginConfigSchema);
  reload?: BrikkoStudioPluginDefinition["reload"];
  nodeHostCommands?: BrikkoStudioPluginDefinition["nodeHostCommands"];
  securityAuditCollectors?: BrikkoStudioPluginDefinition["securityAuditCollectors"];
  register: (api: BrikkoStudioPluginApi) => void;
};

/** Normalized object shape that BrikkoStudio loads from a plugin entry module. */
type DefinedPluginEntry = {
  id: string;
  name: string;
  description: string;
  configSchema: BrikkoStudioPluginConfigSchema;
  register: NonNullable<BrikkoStudioPluginDefinition["register"]>;
} & Pick<
  BrikkoStudioPluginDefinition,
  "kind" | "reload" | "nodeHostCommands" | "securityAuditCollectors"
>;

/**
 * Canonical entry helper for non-channel plugins.
 *
 * Use this for provider, tool, command, service, memory, and context-engine
 * plugins. Channel plugins should use `defineChannelPluginEntry(...)` from
 * `brikko-studio/plugin-sdk/core` so they inherit the channel capability wiring.
 */
export function definePluginEntry({
  id,
  name,
  description,
  kind,
  configSchema = emptyPluginConfigSchema,
  reload,
  nodeHostCommands,
  securityAuditCollectors,
  register,
}: DefinePluginEntryOptions): DefinedPluginEntry {
  const getConfigSchema = createCachedLazyValueGetter(configSchema);
  return {
    id,
    name,
    description,
    ...(kind ? { kind } : {}),
    ...(reload ? { reload } : {}),
    ...(nodeHostCommands ? { nodeHostCommands } : {}),
    ...(securityAuditCollectors ? { securityAuditCollectors } : {}),
    get configSchema() {
      return getConfigSchema();
    },
    register,
  };
}
