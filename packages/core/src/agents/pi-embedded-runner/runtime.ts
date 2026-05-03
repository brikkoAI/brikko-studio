export type EmbeddedAgentRuntime = "pi" | "auto" | (string & {});

export function normalizeEmbeddedAgentRuntime(raw: string | undefined): EmbeddedAgentRuntime {
  const value = raw?.trim();
  if (!value) {
    return "pi";
  }
  if (value === "pi") {
    return "pi";
  }
  if (value === "auto") {
    return "auto";
  }
  if (value === "codex-app-server") {
    return "codex";
  }
  return value;
}

export function resolveEmbeddedAgentRuntime(
  env: NodeJS.ProcessEnv = process.env,
): EmbeddedAgentRuntime {
  return normalizeEmbeddedAgentRuntime(env.BRIKKO_STUDIO_AGENT_RUNTIME?.trim());
}
