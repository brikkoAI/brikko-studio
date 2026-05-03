export {
  type MatrixResolvedStringField,
  type MatrixResolvedStringValues,
  resolveMatrixAccountStringValues,
} from "./src/auth-precedence.js";
export {
  requiresExplicitMatrixDefaultAccount,
  resolveMatrixDefaultOrOnlyAccountId,
} from "./src/account-selection.js";
export {
  findMatrixAccountEntry,
  resolveConfiguredMatrixAccountIds,
  resolveMatrixChannelConfig,
} from "./src/account-selection.js";
export {
  getMatrixScopedEnvVarNames,
  listMatrixEnvAccountIds,
  resolveMatrixEnvAccountToken,
} from "./src/env-vars.js";
export {
  hashMatrixAccessToken,
  resolveMatrixAccountStorageRoot,
  resolveMatrixCredentialsDir,
  resolveMatrixCredentialsFilename,
  resolveMatrixCredentialsPath,
  resolveMatrixHomeserverKey,
  resolveMatrixLegacyFlatStoragePaths,
  resolveMatrixLegacyFlatStoreRoot,
  sanitizeMatrixPathSegment,
} from "./src/storage-paths.js";
export { ensureMatrixSdkInstalled, isMatrixSdkAvailable } from "./src/matrix/deps.js";
export {
  assertHttpUrlTargetsPrivateNetwork,
  closeDispatcher,
  createPinnedDispatcher,
  resolvePinnedHostnameWithPolicy,
  ssrfPolicyFromDangerouslyAllowPrivateNetwork,
  ssrfPolicyFromAllowPrivateNetwork,
  type LookupFn,
  type SsrFPolicy,
} from "brikko-studio/plugin-sdk/ssrf-runtime";
export {
  setMatrixThreadBindingIdleTimeoutBySessionKey,
  setMatrixThreadBindingMaxAgeBySessionKey,
} from "./src/matrix/thread-bindings-shared.js";
export { setMatrixRuntime } from "./src/runtime.js";
export { writeJsonFileAtomically } from "brikko-studio/plugin-sdk/json-store";
export type {
  ChannelDirectoryEntry,
  ChannelMessageActionContext,
} from "brikko-studio/plugin-sdk/channel-contract";
export type { Brikko StudioConfig } from "brikko-studio/plugin-sdk/config-types";
export { formatZonedTimestamp } from "brikko-studio/plugin-sdk/time-runtime";
export type { PluginRuntime, RuntimeLogger } from "brikko-studio/plugin-sdk/plugin-runtime";
export type { RuntimeEnv } from "brikko-studio/plugin-sdk/runtime-env";
export type { WizardPrompter } from "brikko-studio/plugin-sdk/setup";

export function chunkTextForOutbound(text: string, limit: number): string[] {
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > limit) {
    const window = remaining.slice(0, limit);
    const splitAt = Math.max(window.lastIndexOf("\n"), window.lastIndexOf(" "));
    const breakAt = splitAt > 0 ? splitAt : limit;
    chunks.push(remaining.slice(0, breakAt).trimEnd());
    remaining = remaining.slice(breakAt).trimStart();
  }
  if (remaining.length > 0 || text.length === 0) {
    chunks.push(remaining);
  }
  return chunks;
}
