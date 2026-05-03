import type { Brikko StudioConfig } from "../config/types.brikko-studio.js";
import type { PluginRuntime } from "./runtime/types.js";
import type { Brikko StudioPluginApi, PluginLogger } from "./types.js";

export type BuildPluginApiParams = {
  id: string;
  name: string;
  version?: string;
  description?: string;
  source: string;
  rootDir?: string;
  registrationMode: Brikko StudioPluginApi["registrationMode"];
  config: Brikko StudioConfig;
  pluginConfig?: Record<string, unknown>;
  runtime: PluginRuntime;
  logger: PluginLogger;
  resolvePath: (input: string) => string;
  handlers?: Partial<
    Pick<
      Brikko StudioPluginApi,
      | "registerTool"
      | "registerHook"
      | "registerHttpRoute"
      | "registerChannel"
      | "registerGatewayMethod"
      | "registerCli"
      | "registerReload"
      | "registerNodeHostCommand"
      | "registerNodeInvokePolicy"
      | "registerSecurityAuditCollector"
      | "registerService"
      | "registerGatewayDiscoveryService"
      | "registerCliBackend"
      | "registerTextTransforms"
      | "registerConfigMigration"
      | "registerMigrationProvider"
      | "registerAutoEnableProbe"
      | "registerProvider"
      | "registerSpeechProvider"
      | "registerRealtimeTranscriptionProvider"
      | "registerRealtimeVoiceProvider"
      | "registerMediaUnderstandingProvider"
      | "registerImageGenerationProvider"
      | "registerVideoGenerationProvider"
      | "registerMusicGenerationProvider"
      | "registerWebFetchProvider"
      | "registerWebSearchProvider"
      | "registerInteractiveHandler"
      | "onConversationBindingResolved"
      | "registerCommand"
      | "registerContextEngine"
      | "registerCompactionProvider"
      | "registerAgentHarness"
      | "registerCodexAppServerExtensionFactory"
      | "registerAgentToolResultMiddleware"
      | "registerSessionExtension"
      | "enqueueNextTurnInjection"
      | "registerTrustedToolPolicy"
      | "registerToolMetadata"
      | "registerControlUiDescriptor"
      | "registerRuntimeLifecycle"
      | "registerAgentEventSubscription"
      | "setRunContext"
      | "getRunContext"
      | "clearRunContext"
      | "registerSessionSchedulerJob"
      | "registerDetachedTaskRuntime"
      | "registerMemoryCapability"
      | "registerMemoryPromptSection"
      | "registerMemoryPromptSupplement"
      | "registerMemoryCorpusSupplement"
      | "registerMemoryFlushPlan"
      | "registerMemoryRuntime"
      | "registerMemoryEmbeddingProvider"
      | "on"
    >
  >;
};

const noopRegisterTool: Brikko StudioPluginApi["registerTool"] = () => {};
const noopRegisterHook: Brikko StudioPluginApi["registerHook"] = () => {};
const noopRegisterHttpRoute: Brikko StudioPluginApi["registerHttpRoute"] = () => {};
const noopRegisterChannel: Brikko StudioPluginApi["registerChannel"] = () => {};
const noopRegisterGatewayMethod: Brikko StudioPluginApi["registerGatewayMethod"] = () => {};
const noopRegisterCli: Brikko StudioPluginApi["registerCli"] = () => {};
const noopRegisterReload: Brikko StudioPluginApi["registerReload"] = () => {};
const noopRegisterNodeHostCommand: Brikko StudioPluginApi["registerNodeHostCommand"] = () => {};
const noopRegisterNodeInvokePolicy: Brikko StudioPluginApi["registerNodeInvokePolicy"] = () => {};
const noopRegisterSecurityAuditCollector: Brikko StudioPluginApi["registerSecurityAuditCollector"] =
  () => {};
const noopRegisterService: Brikko StudioPluginApi["registerService"] = () => {};
const noopRegisterGatewayDiscoveryService: Brikko StudioPluginApi["registerGatewayDiscoveryService"] =
  () => {};
const noopRegisterCliBackend: Brikko StudioPluginApi["registerCliBackend"] = () => {};
const noopRegisterTextTransforms: Brikko StudioPluginApi["registerTextTransforms"] = () => {};
const noopRegisterConfigMigration: Brikko StudioPluginApi["registerConfigMigration"] = () => {};
const noopRegisterMigrationProvider: Brikko StudioPluginApi["registerMigrationProvider"] = () => {};
const noopRegisterAutoEnableProbe: Brikko StudioPluginApi["registerAutoEnableProbe"] = () => {};
const noopRegisterProvider: Brikko StudioPluginApi["registerProvider"] = () => {};
const noopRegisterSpeechProvider: Brikko StudioPluginApi["registerSpeechProvider"] = () => {};
const noopRegisterRealtimeTranscriptionProvider: Brikko StudioPluginApi["registerRealtimeTranscriptionProvider"] =
  () => {};
const noopRegisterRealtimeVoiceProvider: Brikko StudioPluginApi["registerRealtimeVoiceProvider"] =
  () => {};
const noopRegisterMediaUnderstandingProvider: Brikko StudioPluginApi["registerMediaUnderstandingProvider"] =
  () => {};
const noopRegisterImageGenerationProvider: Brikko StudioPluginApi["registerImageGenerationProvider"] =
  () => {};
const noopRegisterVideoGenerationProvider: Brikko StudioPluginApi["registerVideoGenerationProvider"] =
  () => {};
const noopRegisterMusicGenerationProvider: Brikko StudioPluginApi["registerMusicGenerationProvider"] =
  () => {};
const noopRegisterWebFetchProvider: Brikko StudioPluginApi["registerWebFetchProvider"] = () => {};
const noopRegisterWebSearchProvider: Brikko StudioPluginApi["registerWebSearchProvider"] = () => {};
const noopRegisterInteractiveHandler: Brikko StudioPluginApi["registerInteractiveHandler"] = () => {};
const noopOnConversationBindingResolved: Brikko StudioPluginApi["onConversationBindingResolved"] =
  () => {};
const noopRegisterCommand: Brikko StudioPluginApi["registerCommand"] = () => {};
const noopRegisterContextEngine: Brikko StudioPluginApi["registerContextEngine"] = () => {};
const noopRegisterCompactionProvider: Brikko StudioPluginApi["registerCompactionProvider"] = () => {};
const noopRegisterAgentHarness: Brikko StudioPluginApi["registerAgentHarness"] = () => {};
const noopRegisterCodexAppServerExtensionFactory: Brikko StudioPluginApi["registerCodexAppServerExtensionFactory"] =
  () => {};
const noopRegisterAgentToolResultMiddleware: Brikko StudioPluginApi["registerAgentToolResultMiddleware"] =
  () => {};
const noopRegisterSessionExtension: Brikko StudioPluginApi["registerSessionExtension"] = () => {};
const noopEnqueueNextTurnInjection: Brikko StudioPluginApi["enqueueNextTurnInjection"] = async (
  injection,
) => ({ enqueued: false, id: "", sessionKey: injection.sessionKey });
const noopRegisterTrustedToolPolicy: Brikko StudioPluginApi["registerTrustedToolPolicy"] = () => {};
const noopRegisterToolMetadata: Brikko StudioPluginApi["registerToolMetadata"] = () => {};
const noopRegisterControlUiDescriptor: Brikko StudioPluginApi["registerControlUiDescriptor"] = () => {};
const noopRegisterRuntimeLifecycle: Brikko StudioPluginApi["registerRuntimeLifecycle"] = () => {};
const noopRegisterAgentEventSubscription: Brikko StudioPluginApi["registerAgentEventSubscription"] =
  () => {};
const noopSetRunContext: Brikko StudioPluginApi["setRunContext"] = () => false;
const noopGetRunContext: Brikko StudioPluginApi["getRunContext"] = () => undefined;
const noopClearRunContext: Brikko StudioPluginApi["clearRunContext"] = () => {};
const noopRegisterSessionSchedulerJob: Brikko StudioPluginApi["registerSessionSchedulerJob"] = () =>
  undefined;
const noopRegisterDetachedTaskRuntime: Brikko StudioPluginApi["registerDetachedTaskRuntime"] = () => {};
const noopRegisterMemoryCapability: Brikko StudioPluginApi["registerMemoryCapability"] = () => {};
const noopRegisterMemoryPromptSection: Brikko StudioPluginApi["registerMemoryPromptSection"] = () => {};
const noopRegisterMemoryPromptSupplement: Brikko StudioPluginApi["registerMemoryPromptSupplement"] =
  () => {};
const noopRegisterMemoryCorpusSupplement: Brikko StudioPluginApi["registerMemoryCorpusSupplement"] =
  () => {};
const noopRegisterMemoryFlushPlan: Brikko StudioPluginApi["registerMemoryFlushPlan"] = () => {};
const noopRegisterMemoryRuntime: Brikko StudioPluginApi["registerMemoryRuntime"] = () => {};
const noopRegisterMemoryEmbeddingProvider: Brikko StudioPluginApi["registerMemoryEmbeddingProvider"] =
  () => {};
const noopOn: Brikko StudioPluginApi["on"] = () => {};

export function buildPluginApi(params: BuildPluginApiParams): Brikko StudioPluginApi {
  const handlers = params.handlers ?? {};
  return {
    id: params.id,
    name: params.name,
    version: params.version,
    description: params.description,
    source: params.source,
    rootDir: params.rootDir,
    registrationMode: params.registrationMode,
    config: params.config,
    pluginConfig: params.pluginConfig,
    runtime: params.runtime,
    logger: params.logger,
    registerTool: handlers.registerTool ?? noopRegisterTool,
    registerHook: handlers.registerHook ?? noopRegisterHook,
    registerHttpRoute: handlers.registerHttpRoute ?? noopRegisterHttpRoute,
    registerChannel: handlers.registerChannel ?? noopRegisterChannel,
    registerGatewayMethod: handlers.registerGatewayMethod ?? noopRegisterGatewayMethod,
    registerCli: handlers.registerCli ?? noopRegisterCli,
    registerReload: handlers.registerReload ?? noopRegisterReload,
    registerNodeHostCommand: handlers.registerNodeHostCommand ?? noopRegisterNodeHostCommand,
    registerNodeInvokePolicy: handlers.registerNodeInvokePolicy ?? noopRegisterNodeInvokePolicy,
    registerSecurityAuditCollector:
      handlers.registerSecurityAuditCollector ?? noopRegisterSecurityAuditCollector,
    registerService: handlers.registerService ?? noopRegisterService,
    registerGatewayDiscoveryService:
      handlers.registerGatewayDiscoveryService ?? noopRegisterGatewayDiscoveryService,
    registerCliBackend: handlers.registerCliBackend ?? noopRegisterCliBackend,
    registerTextTransforms: handlers.registerTextTransforms ?? noopRegisterTextTransforms,
    registerConfigMigration: handlers.registerConfigMigration ?? noopRegisterConfigMigration,
    registerMigrationProvider: handlers.registerMigrationProvider ?? noopRegisterMigrationProvider,
    registerAutoEnableProbe: handlers.registerAutoEnableProbe ?? noopRegisterAutoEnableProbe,
    registerProvider: handlers.registerProvider ?? noopRegisterProvider,
    registerSpeechProvider: handlers.registerSpeechProvider ?? noopRegisterSpeechProvider,
    registerRealtimeTranscriptionProvider:
      handlers.registerRealtimeTranscriptionProvider ?? noopRegisterRealtimeTranscriptionProvider,
    registerRealtimeVoiceProvider:
      handlers.registerRealtimeVoiceProvider ?? noopRegisterRealtimeVoiceProvider,
    registerMediaUnderstandingProvider:
      handlers.registerMediaUnderstandingProvider ?? noopRegisterMediaUnderstandingProvider,
    registerImageGenerationProvider:
      handlers.registerImageGenerationProvider ?? noopRegisterImageGenerationProvider,
    registerVideoGenerationProvider:
      handlers.registerVideoGenerationProvider ?? noopRegisterVideoGenerationProvider,
    registerMusicGenerationProvider:
      handlers.registerMusicGenerationProvider ?? noopRegisterMusicGenerationProvider,
    registerWebFetchProvider: handlers.registerWebFetchProvider ?? noopRegisterWebFetchProvider,
    registerWebSearchProvider: handlers.registerWebSearchProvider ?? noopRegisterWebSearchProvider,
    registerInteractiveHandler:
      handlers.registerInteractiveHandler ?? noopRegisterInteractiveHandler,
    onConversationBindingResolved:
      handlers.onConversationBindingResolved ?? noopOnConversationBindingResolved,
    registerCommand: handlers.registerCommand ?? noopRegisterCommand,
    registerContextEngine: handlers.registerContextEngine ?? noopRegisterContextEngine,
    registerCompactionProvider:
      handlers.registerCompactionProvider ?? noopRegisterCompactionProvider,
    registerAgentHarness: handlers.registerAgentHarness ?? noopRegisterAgentHarness,
    registerCodexAppServerExtensionFactory:
      handlers.registerCodexAppServerExtensionFactory ?? noopRegisterCodexAppServerExtensionFactory,
    registerAgentToolResultMiddleware:
      handlers.registerAgentToolResultMiddleware ?? noopRegisterAgentToolResultMiddleware,
    registerSessionExtension: handlers.registerSessionExtension ?? noopRegisterSessionExtension,
    enqueueNextTurnInjection: handlers.enqueueNextTurnInjection ?? noopEnqueueNextTurnInjection,
    registerTrustedToolPolicy: handlers.registerTrustedToolPolicy ?? noopRegisterTrustedToolPolicy,
    registerToolMetadata: handlers.registerToolMetadata ?? noopRegisterToolMetadata,
    registerControlUiDescriptor:
      handlers.registerControlUiDescriptor ?? noopRegisterControlUiDescriptor,
    registerRuntimeLifecycle: handlers.registerRuntimeLifecycle ?? noopRegisterRuntimeLifecycle,
    registerAgentEventSubscription:
      handlers.registerAgentEventSubscription ?? noopRegisterAgentEventSubscription,
    setRunContext: handlers.setRunContext ?? noopSetRunContext,
    getRunContext: handlers.getRunContext ?? noopGetRunContext,
    clearRunContext: handlers.clearRunContext ?? noopClearRunContext,
    registerSessionSchedulerJob:
      handlers.registerSessionSchedulerJob ?? noopRegisterSessionSchedulerJob,
    registerDetachedTaskRuntime:
      handlers.registerDetachedTaskRuntime ?? noopRegisterDetachedTaskRuntime,
    registerMemoryCapability: handlers.registerMemoryCapability ?? noopRegisterMemoryCapability,
    registerMemoryPromptSection:
      handlers.registerMemoryPromptSection ?? noopRegisterMemoryPromptSection,
    registerMemoryPromptSupplement:
      handlers.registerMemoryPromptSupplement ?? noopRegisterMemoryPromptSupplement,
    registerMemoryCorpusSupplement:
      handlers.registerMemoryCorpusSupplement ?? noopRegisterMemoryCorpusSupplement,
    registerMemoryFlushPlan: handlers.registerMemoryFlushPlan ?? noopRegisterMemoryFlushPlan,
    registerMemoryRuntime: handlers.registerMemoryRuntime ?? noopRegisterMemoryRuntime,
    registerMemoryEmbeddingProvider:
      handlers.registerMemoryEmbeddingProvider ?? noopRegisterMemoryEmbeddingProvider,
    resolvePath: params.resolvePath,
    on: handlers.on ?? noopOn,
  };
}
