import type { BrikkoStudioConfig } from "../config/types.brikko-studio.js";
import type { PluginRuntime } from "./runtime/types.js";
import type { BrikkoStudioPluginApi, PluginLogger } from "./types.js";

export type BuildPluginApiParams = {
  id: string;
  name: string;
  version?: string;
  description?: string;
  source: string;
  rootDir?: string;
  registrationMode: BrikkoStudioPluginApi["registrationMode"];
  config: BrikkoStudioConfig;
  pluginConfig?: Record<string, unknown>;
  runtime: PluginRuntime;
  logger: PluginLogger;
  resolvePath: (input: string) => string;
  handlers?: Partial<
    Pick<
      BrikkoStudioPluginApi,
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

const noopRegisterTool: BrikkoStudioPluginApi["registerTool"] = () => {};
const noopRegisterHook: BrikkoStudioPluginApi["registerHook"] = () => {};
const noopRegisterHttpRoute: BrikkoStudioPluginApi["registerHttpRoute"] = () => {};
const noopRegisterChannel: BrikkoStudioPluginApi["registerChannel"] = () => {};
const noopRegisterGatewayMethod: BrikkoStudioPluginApi["registerGatewayMethod"] = () => {};
const noopRegisterCli: BrikkoStudioPluginApi["registerCli"] = () => {};
const noopRegisterReload: BrikkoStudioPluginApi["registerReload"] = () => {};
const noopRegisterNodeHostCommand: BrikkoStudioPluginApi["registerNodeHostCommand"] = () => {};
const noopRegisterNodeInvokePolicy: BrikkoStudioPluginApi["registerNodeInvokePolicy"] = () => {};
const noopRegisterSecurityAuditCollector: BrikkoStudioPluginApi["registerSecurityAuditCollector"] =
  () => {};
const noopRegisterService: BrikkoStudioPluginApi["registerService"] = () => {};
const noopRegisterGatewayDiscoveryService: BrikkoStudioPluginApi["registerGatewayDiscoveryService"] =
  () => {};
const noopRegisterCliBackend: BrikkoStudioPluginApi["registerCliBackend"] = () => {};
const noopRegisterTextTransforms: BrikkoStudioPluginApi["registerTextTransforms"] = () => {};
const noopRegisterConfigMigration: BrikkoStudioPluginApi["registerConfigMigration"] = () => {};
const noopRegisterMigrationProvider: BrikkoStudioPluginApi["registerMigrationProvider"] = () => {};
const noopRegisterAutoEnableProbe: BrikkoStudioPluginApi["registerAutoEnableProbe"] = () => {};
const noopRegisterProvider: BrikkoStudioPluginApi["registerProvider"] = () => {};
const noopRegisterSpeechProvider: BrikkoStudioPluginApi["registerSpeechProvider"] = () => {};
const noopRegisterRealtimeTranscriptionProvider: BrikkoStudioPluginApi["registerRealtimeTranscriptionProvider"] =
  () => {};
const noopRegisterRealtimeVoiceProvider: BrikkoStudioPluginApi["registerRealtimeVoiceProvider"] =
  () => {};
const noopRegisterMediaUnderstandingProvider: BrikkoStudioPluginApi["registerMediaUnderstandingProvider"] =
  () => {};
const noopRegisterImageGenerationProvider: BrikkoStudioPluginApi["registerImageGenerationProvider"] =
  () => {};
const noopRegisterVideoGenerationProvider: BrikkoStudioPluginApi["registerVideoGenerationProvider"] =
  () => {};
const noopRegisterMusicGenerationProvider: BrikkoStudioPluginApi["registerMusicGenerationProvider"] =
  () => {};
const noopRegisterWebFetchProvider: BrikkoStudioPluginApi["registerWebFetchProvider"] = () => {};
const noopRegisterWebSearchProvider: BrikkoStudioPluginApi["registerWebSearchProvider"] = () => {};
const noopRegisterInteractiveHandler: BrikkoStudioPluginApi["registerInteractiveHandler"] = () => {};
const noopOnConversationBindingResolved: BrikkoStudioPluginApi["onConversationBindingResolved"] =
  () => {};
const noopRegisterCommand: BrikkoStudioPluginApi["registerCommand"] = () => {};
const noopRegisterContextEngine: BrikkoStudioPluginApi["registerContextEngine"] = () => {};
const noopRegisterCompactionProvider: BrikkoStudioPluginApi["registerCompactionProvider"] = () => {};
const noopRegisterAgentHarness: BrikkoStudioPluginApi["registerAgentHarness"] = () => {};
const noopRegisterCodexAppServerExtensionFactory: BrikkoStudioPluginApi["registerCodexAppServerExtensionFactory"] =
  () => {};
const noopRegisterAgentToolResultMiddleware: BrikkoStudioPluginApi["registerAgentToolResultMiddleware"] =
  () => {};
const noopRegisterSessionExtension: BrikkoStudioPluginApi["registerSessionExtension"] = () => {};
const noopEnqueueNextTurnInjection: BrikkoStudioPluginApi["enqueueNextTurnInjection"] = async (
  injection,
) => ({ enqueued: false, id: "", sessionKey: injection.sessionKey });
const noopRegisterTrustedToolPolicy: BrikkoStudioPluginApi["registerTrustedToolPolicy"] = () => {};
const noopRegisterToolMetadata: BrikkoStudioPluginApi["registerToolMetadata"] = () => {};
const noopRegisterControlUiDescriptor: BrikkoStudioPluginApi["registerControlUiDescriptor"] = () => {};
const noopRegisterRuntimeLifecycle: BrikkoStudioPluginApi["registerRuntimeLifecycle"] = () => {};
const noopRegisterAgentEventSubscription: BrikkoStudioPluginApi["registerAgentEventSubscription"] =
  () => {};
const noopSetRunContext: BrikkoStudioPluginApi["setRunContext"] = () => false;
const noopGetRunContext: BrikkoStudioPluginApi["getRunContext"] = () => undefined;
const noopClearRunContext: BrikkoStudioPluginApi["clearRunContext"] = () => {};
const noopRegisterSessionSchedulerJob: BrikkoStudioPluginApi["registerSessionSchedulerJob"] = () =>
  undefined;
const noopRegisterDetachedTaskRuntime: BrikkoStudioPluginApi["registerDetachedTaskRuntime"] = () => {};
const noopRegisterMemoryCapability: BrikkoStudioPluginApi["registerMemoryCapability"] = () => {};
const noopRegisterMemoryPromptSection: BrikkoStudioPluginApi["registerMemoryPromptSection"] = () => {};
const noopRegisterMemoryPromptSupplement: BrikkoStudioPluginApi["registerMemoryPromptSupplement"] =
  () => {};
const noopRegisterMemoryCorpusSupplement: BrikkoStudioPluginApi["registerMemoryCorpusSupplement"] =
  () => {};
const noopRegisterMemoryFlushPlan: BrikkoStudioPluginApi["registerMemoryFlushPlan"] = () => {};
const noopRegisterMemoryRuntime: BrikkoStudioPluginApi["registerMemoryRuntime"] = () => {};
const noopRegisterMemoryEmbeddingProvider: BrikkoStudioPluginApi["registerMemoryEmbeddingProvider"] =
  () => {};
const noopOn: BrikkoStudioPluginApi["on"] = () => {};

export function buildPluginApi(params: BuildPluginApiParams): BrikkoStudioPluginApi {
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
