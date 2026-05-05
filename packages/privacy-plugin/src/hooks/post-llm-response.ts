import type { AnonymizerClient } from "../anonymizer-client.js";
import { AnonymizerUnavailableError } from "../errors.js";
import type { HookResult, LlmResponseContext } from "../types.js";
import type { HookLogger } from "./pre-user-message.js";

/**
 * post_llm_response — restore placeholders in the LLM's response back to
 * their original surface forms.
 *
 * Flow:
 *   1. Pass the LLM text to the anonymizer's /restore endpoint.
 *   2. Replace `ctx.response.text` with the restored text.
 *   3. If the sidecar reports hallucinated placeholders (LLM emitted a
 *      `<NAME_99>` we never minted), forward those on `response.hallucinated`
 *      so the chat UI (Task 21) can render them with an "AI-generated" badge.
 *
 * Failure mode: sidecar offline → fail-open. We return the raw text with
 * placeholders intact rather than blocking the LLM response. The chat UI
 * detects the missing restore via a separate signal (Toast.tsx) and warns
 * the user. Blocking on restore would mean a transient sidecar outage
 * eats the user's LLM response — strictly worse UX than showing
 * placeholders. This mirrors `apps/gateway/voltari_gateway/pii/restore.py`
 * which also fails open on the egress path.
 */
export function makePostLlmResponseHook(
  client: AnonymizerClient,
  log: HookLogger,
) {
  return async function postLlmResponse(
    ctx: LlmResponseContext,
  ): Promise<HookResult<LlmResponseContext>> {
    log("post_llm_response", ctx.request_id, {
      textLen: ctx.response.text.length,
    });
    try {
      const restored = await client.restore({
        workspace_id: ctx.workspace.id,
        request_id: ctx.request_id,
        text: ctx.response.text,
      });
      const out: LlmResponseContext = {
        ...ctx,
        response: { text: restored.restored_text },
      };
      if (restored.hallucinated.length > 0) {
        out.response.hallucinated = restored.hallucinated;
      }
      return out;
    } catch (err) {
      if (err instanceof AnonymizerUnavailableError) {
        log("post_llm_response:fail-open", ctx.request_id, {
          reason: "anonymizer_offline",
        });
        return ctx;
      }
      throw err;
    }
  };
}
