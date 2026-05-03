const COMMON_LIVE_ENV_NAMES = [
  "BRIKKO_STUDIO_AGENT_RUNTIME",
  "BRIKKO_STUDIO_CONFIG_PATH",
  "BRIKKO_STUDIO_GATEWAY_TOKEN",
  "OPENAI_API_KEY",
  "OPENAI_BASE_URL",
  "BRIKKO_STUDIO_SKIP_BROWSER_CONTROL_SERVER",
  "BRIKKO_STUDIO_SKIP_CANVAS_HOST",
  "BRIKKO_STUDIO_SKIP_CHANNELS",
  "BRIKKO_STUDIO_SKIP_CRON",
  "BRIKKO_STUDIO_SKIP_GMAIL_WATCHER",
  "BRIKKO_STUDIO_STATE_DIR",
] as const;

export type LiveEnvSnapshot = Record<string, string | undefined>;

export function snapshotLiveEnv(extraNames: readonly string[] = []): LiveEnvSnapshot {
  const snapshot: LiveEnvSnapshot = {};
  for (const name of [...COMMON_LIVE_ENV_NAMES, ...extraNames]) {
    snapshot[name] = process.env[name];
  }
  return snapshot;
}

export function restoreLiveEnv(snapshot: LiveEnvSnapshot): void {
  for (const [name, value] of Object.entries(snapshot)) {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
}
