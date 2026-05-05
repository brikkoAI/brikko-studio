import type { AnonymizerClient } from "../anonymizer-client.js";
import { LatePIIDetectedError } from "../errors.js";
import type { HookResult, MessageContext } from "../types.js";
import type { HookLogger } from "./pre-user-message.js";

/**
 * pre_llm_call — defence-in-depth final mask check.
 *
 * Even if every upstream hook behaved correctly, real PII can still slip
 * through (e.g. memory layer reads, system-prompt edits, prefill content).
 * This hook is the last guard before bytes leave for the LLM provider:
 * one more `/anonymize` pass catches anything the pipeline missed.
 *
 * Profile-aware response when PII IS detected here:
 *   - `strict`     → throw `LatePIIDetectedError` (abort the call entirely;
 *                    operator should triage the upstream gap).
 *   - `balanced`   → silently mask and proceed (default: prioritise UX).
 *   - `permissive` → log a warning and proceed unchanged (the workspace
 *                    has explicitly opted out of strict mask discipline).
 *
 * Failure mode: sidecar offline. We let the AnonymizerUnavailableError
 * propagate — at this stage, deciding what to do with raw text is the
 * orchestrator's call (it can fail open by skipping the hook). The hook
 * itself does not fail open silently because that would defeat the
 * defence-in-depth contract.
 */
export function makePreLlmCallHook(
  client: AnonymizerClient,
  log: HookLogger,
) {
  return async function preLlmCall(
    ctx: MessageContext,
  ): Promise<HookResult<MessageContext>> {
    log("pre_llm_call", ctx.request_id, {
      textLen: ctx.message.text.length,
      profile: ctx.workspace.policy_profile,
    });
    const checked = await client.anonymize({
      workspace_id: ctx.workspace.id,
      request_id: ctx.request_id,
      text: ctx.message.text,
    });
    if (checked.entities.length === 0) {
      // No leak — the upstream hooks did their job. Return ctx unchanged
      // so we don't even allocate a copy in the hot path.
      return ctx;
    }
    const profile = ctx.workspace.policy_profile;
    if (profile === "strict") {
      log("pre_llm_call:abort", ctx.request_id, {
        reason: "late_pii_detected",
        entities: checked.entities.length,
      });
      throw new LatePIIDetectedError(checked.entities.length);
    }
    if (profile === "permissive") {
      log("pre_llm_call:warn", ctx.request_id, {
        reason: "late_pii_detected",
        entities: checked.entities.length,
        action: "passthrough",
      });
      return ctx;
    }
    // balanced
    log("pre_llm_call:remask", ctx.request_id, {
      reason: "late_pii_detected",
      entities: checked.entities.length,
    });
    return { ...ctx, message: { ...ctx.message, text: checked.masked_text } };
  };
}
