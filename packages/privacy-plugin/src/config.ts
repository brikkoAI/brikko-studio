import { z } from "zod";

const ConfigSchema = z.object({
  anonymizerUrl: z.string().url().default("http://anonymizer:8403"),
  requestTimeoutMs: z.number().int().positive().default(5000),
  circuitBreakerMs: z.number().int().positive().default(30_000),
  toolPoliciesPath: z.string().default("/etc/brikko/tool-policies.yaml"),
  debugLogging: z.boolean().default(false),
  /** Number of attempts on 5xx / network errors. 1 = no retry. */
  maxRetries: z.number().int().min(1).max(10).default(3),
  /** Base delay for exponential backoff (multiplied by 2^(attempt-1)). */
  retryBaseDelayMs: z.number().int().nonnegative().default(100),
});

export type PluginConfig = z.infer<typeof ConfigSchema>;

/**
 * Load plugin config from process env. Reads:
 *   - BRIKKO_ANONYMIZER_URL (default: http://anonymizer:8403)
 *   - BRIKKO_ANONYMIZER_TIMEOUT_MS (default: 5000)
 *   - BRIKKO_ANONYMIZER_CB_MS (default: 30000)
 *   - BRIKKO_TOOL_POLICIES_PATH (default: /etc/brikko/tool-policies.yaml)
 *   - BRIKKO_PLUGIN_DEBUG ("1" enables debug logging)
 *   - BRIKKO_ANONYMIZER_MAX_RETRIES (default: 3)
 *   - BRIKKO_ANONYMIZER_RETRY_BASE_MS (default: 100)
 */
export function loadConfigFromEnv(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): PluginConfig {
  const intOrUndef = (raw: string | undefined): number | undefined => {
    if (raw === undefined || raw === "") return undefined;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : undefined;
  };
  return ConfigSchema.parse({
    anonymizerUrl: env["BRIKKO_ANONYMIZER_URL"],
    requestTimeoutMs: intOrUndef(env["BRIKKO_ANONYMIZER_TIMEOUT_MS"]),
    circuitBreakerMs: intOrUndef(env["BRIKKO_ANONYMIZER_CB_MS"]),
    toolPoliciesPath: env["BRIKKO_TOOL_POLICIES_PATH"],
    debugLogging: env["BRIKKO_PLUGIN_DEBUG"] === "1",
    maxRetries: intOrUndef(env["BRIKKO_ANONYMIZER_MAX_RETRIES"]),
    retryBaseDelayMs: intOrUndef(env["BRIKKO_ANONYMIZER_RETRY_BASE_MS"]),
  });
}
