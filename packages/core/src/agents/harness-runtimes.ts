import type { Brikko StudioConfig } from "../config/types.brikko-studio.js";
import { normalizeOptionalLowercaseString } from "../shared/string-coerce.js";
import { isRecord } from "../utils.js";
import { resolveAgentRuntimePolicy } from "./agent-runtime-policy.js";

export function collectConfiguredAgentHarnessRuntimes(
  config: Brikko StudioConfig,
  env: NodeJS.ProcessEnv,
): string[] {
  const runtimes = new Set<string>();
  const pushRuntime = (value: unknown) => {
    if (typeof value !== "string") {
      return;
    }
    const normalized = normalizeOptionalLowercaseString(value);
    if (!normalized || normalized === "auto" || normalized === "pi") {
      return;
    }
    runtimes.add(normalized);
  };

  pushRuntime(resolveAgentRuntimePolicy(config.agents?.defaults)?.id);
  if (Array.isArray(config.agents?.list)) {
    for (const agent of config.agents.list) {
      if (!isRecord(agent)) {
        continue;
      }
      pushRuntime(resolveAgentRuntimePolicy(agent)?.id);
    }
  }
  pushRuntime(env.BRIKKO_STUDIO_AGENT_RUNTIME);

  return [...runtimes].toSorted((left, right) => left.localeCompare(right));
}
