import type { AnonymizerClient } from "./anonymizer-client.js";

const MIN_TEXT_LEN_FOR_NER = 3;

export interface ReMaskOptions {
  client: AnonymizerClient;
  workspaceId: string;
  requestId: string;
}

/**
 * Walk a tool-result tree and re-anonymize every text-bearing string.
 *
 * MCPs that returned real PII (e.g. Bitrix24 returns `Иванов Иван`) must
 * be re-masked before the result lands in the LLM prompt — otherwise the
 * LLM sees originals and the placeholder discipline is broken.
 *
 * Walk semantics:
 *   - `null` / `undefined` → passed through.
 *   - strings of length >= 3 → run through `client.anonymize` (shorter
 *     strings are statistically unlikely to be NER-relevant and avoid a
 *     round-trip per `id` / status code).
 *   - arrays → mapped element-wise (parallel via Promise.all).
 *   - plain objects → walked sequentially over keys so the audit log
 *     reads top-down (deterministic ordering).
 *   - numbers / booleans → passed through unchanged.
 *
 * Order trade-off: arrays parallelise (each element is independent),
 * object keys serialise (preserves audit-log readability — minimal
 * additional latency in practice since most results are flat).
 */
export async function reMaskTree(
  value: unknown,
  opts: ReMaskOptions,
): Promise<unknown> {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    if (value.length < MIN_TEXT_LEN_FOR_NER) return value;
    const out = await opts.client.anonymize({
      workspace_id: opts.workspaceId,
      request_id: opts.requestId,
      text: value,
    });
    return out.masked_text;
  }
  if (Array.isArray(value)) {
    return Promise.all(value.map((v) => reMaskTree(v, opts)));
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(obj)) {
      out[k] = await reMaskTree(obj[k], opts);
    }
    return out;
  }
  return value;
}
