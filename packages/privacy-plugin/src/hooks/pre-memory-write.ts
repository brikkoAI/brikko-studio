import type { AnonymizerClient } from "../anonymizer-client.js";
import { maskMemoryContent } from "../memory-mask.js";
import type { HookResult, MemoryWriteContext } from "../types.js";
import type { HookLogger } from "./pre-user-message.js";

/**
 * pre_memory_write — anonymize memory content before it lands on disk.
 *
 * Per spec §4.6: "долговременная память не должна содержать реальных ПДн
 * ни при каких обстоятельствах". This hook is the only mask point on the
 * memory-write path; if it fails or is bypassed, we leak originals to
 * disk where they survive process restarts.
 *
 * Failure mode: FAIL CLOSED. We deliberately do NOT catch
 * `AnonymizerUnavailableError` — letting the error propagate aborts the
 * memory write entirely. Even in `permissive` profile, leaking PII to
 * persistent storage is strictly worse than skipping a memory write.
 *
 * The `memory.key` field is intentionally NOT anonymized — it's the
 * structural address (e.g. "client_pref_X"), not free text from the user.
 * Masking it would break the read path, since restore is content-only.
 */
export function makePreMemoryWriteHook(
  client: AnonymizerClient,
  log: HookLogger,
) {
  return async function preMemoryWrite(
    ctx: MemoryWriteContext,
  ): Promise<HookResult<MemoryWriteContext>> {
    log("pre_memory_write", ctx.request_id, { key: ctx.memory.key });
    const masked = await maskMemoryContent(
      client,
      ctx.workspace.id,
      ctx.request_id,
      ctx.memory.content,
    );
    return { ...ctx, memory: { ...ctx.memory, content: masked } };
  };
}
