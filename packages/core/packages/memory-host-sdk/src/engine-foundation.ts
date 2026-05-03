// Real workspace contract for memory engine foundation concerns.

export {
  resolveAgentContextLimits,
  resolveAgentDir,
  resolveAgentWorkspaceDir,
  resolveDefaultAgentId,
  resolveSessionAgentId,
} from "./host/brikko-studio-runtime-agent.js";
export {
  resolveMemorySearchConfig,
  resolveMemorySearchSyncConfig,
  type ResolvedMemorySearchConfig,
  type ResolvedMemorySearchSyncConfig,
} from "./host/brikko-studio-runtime-agent.js";
export { parseDurationMs } from "./host/brikko-studio-runtime-config.js";
export { loadConfig } from "./host/brikko-studio-runtime-config.js";
export { resolveStateDir } from "./host/brikko-studio-runtime-config.js";
export { resolveSessionTranscriptsDirForAgent } from "./host/brikko-studio-runtime-config.js";
export {
  hasConfiguredSecretInput,
  normalizeResolvedSecretInputString,
} from "./host/brikko-studio-runtime-config.js";
export { writeFileWithinRoot } from "./host/brikko-studio-runtime-io.js";
export { createSubsystemLogger } from "./host/brikko-studio-runtime-io.js";
export { detectMime } from "./host/brikko-studio-runtime-io.js";
export { resolveGlobalSingleton } from "./host/brikko-studio-runtime-io.js";
export { onSessionTranscriptUpdate } from "./host/brikko-studio-runtime-session.js";
export { splitShellArgs } from "./host/brikko-studio-runtime-io.js";
export { runTasksWithConcurrency } from "./host/brikko-studio-runtime-io.js";
export {
  shortenHomeInString,
  shortenHomePath,
  resolveUserPath,
  truncateUtf16Safe,
} from "./host/brikko-studio-runtime-io.js";
export type { BrikkoStudioConfig } from "./host/brikko-studio-runtime-config.js";
export type { SessionSendPolicyConfig } from "./host/brikko-studio-runtime-config.js";
export type { SecretInput } from "./host/brikko-studio-runtime-config.js";
export type {
  MemoryBackend,
  MemoryCitationsMode,
  MemoryQmdConfig,
  MemoryQmdIndexPath,
  MemoryQmdMcporterConfig,
  MemoryQmdSearchMode,
} from "./host/brikko-studio-runtime-config.js";
export type { MemorySearchConfig } from "./host/brikko-studio-runtime-config.js";
