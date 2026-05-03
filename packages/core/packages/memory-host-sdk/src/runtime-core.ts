// Focused runtime contract for memory plugin config/state/helpers.

export type { AnyAgentTool } from "./host/brikko-studio-runtime-agent.js";
export { resolveCronStyleNow } from "./host/brikko-studio-runtime-agent.js";
export { DEFAULT_PI_COMPACTION_RESERVE_TOKENS_FLOOR } from "./host/brikko-studio-runtime-agent.js";
export { resolveDefaultAgentId, resolveSessionAgentId } from "./host/brikko-studio-runtime-agent.js";
export { resolveMemorySearchConfig } from "./host/brikko-studio-runtime-agent.js";
export {
  asToolParamsRecord,
  jsonResult,
  readNumberParam,
  readStringParam,
} from "./host/brikko-studio-runtime-agent.js";
export { SILENT_REPLY_TOKEN } from "./host/brikko-studio-runtime-session.js";
export { parseNonNegativeByteSize } from "./host/brikko-studio-runtime-config.js";
export {
  getRuntimeConfig,
  /** @deprecated Use getRuntimeConfig(), or pass the already loaded config through the call path. */
  loadConfig,
} from "./host/brikko-studio-runtime-config.js";
export { resolveStateDir } from "./host/brikko-studio-runtime-config.js";
export { resolveSessionTranscriptsDirForAgent } from "./host/brikko-studio-runtime-config.js";
export { emptyPluginConfigSchema } from "./host/brikko-studio-runtime-memory.js";
export {
  buildActiveMemoryPromptSection,
  getMemoryCapabilityRegistration,
  listActiveMemoryPublicArtifacts,
} from "./host/brikko-studio-runtime-memory.js";
export { parseAgentSessionKey } from "./host/brikko-studio-runtime-agent.js";
export type { Brikko StudioConfig } from "./host/brikko-studio-runtime-config.js";
export type { MemoryCitationsMode } from "./host/brikko-studio-runtime-config.js";
export type {
  MemoryFlushPlan,
  MemoryFlushPlanResolver,
  MemoryPluginCapability,
  MemoryPluginPublicArtifact,
  MemoryPluginPublicArtifactsProvider,
  MemoryPluginRuntime,
  MemoryPromptSectionBuilder,
} from "./host/brikko-studio-runtime-memory.js";
export type { Brikko StudioPluginApi } from "./host/brikko-studio-runtime-memory.js";
