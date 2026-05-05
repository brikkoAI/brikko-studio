import type { AnonymizerClient } from "../anonymizer-client.js";
import { AnonymizerUnavailableError } from "../errors.js";
import type { HookResult, MessageContext } from "../types.js";

export type HookLogger = (
  hook: string,
  requestId: string,
  fields: Record<string, unknown>,
) => void;

/**
 * pre_user_message — anonymize the user-authored message before it is sent
 * to the LLM provider.
 *
 * Flow:
 *   1. Call the anonymizer sidecar with the raw text.
 *   2. Replace `ctx.message.text` with the masked text.
 *   3. Forward the new context.
 *
 * Failure modes:
 *   - Sidecar unavailable + profile=strict|balanced → throw, abort request.
 *     The chat UI surfaces a "PII anonymizer unavailable" error.
 *   - Sidecar unavailable + profile=permissive → fail-open, leak original.
 *     The sidecar's audit log will record degraded-mode events when it
 *     recovers; permissive workspaces have explicitly accepted that risk.
 *   - Sidecar HTTP 4xx/5xx (AnonymizerRequestError) → re-thrown unchanged.
 *
 * The hook does NOT persist the entity mapping itself — the sidecar owns
 * the workspace mapping store. We trust the sidecar to deduplicate
 * placeholders within a workspace across requests.
 */
export function makePreUserMessageHook(
  client: AnonymizerClient,
  log: HookLogger,
) {
  return async function preUserMessage(
    ctx: MessageContext,
  ): Promise<HookResult<MessageContext>> {
    log("pre_user_message", ctx.request_id, {
      textLen: ctx.message.text.length,
      profile: ctx.workspace.policy_profile,
    });
    try {
      const masked = await client.anonymize({
        workspace_id: ctx.workspace.id,
        request_id: ctx.request_id,
        text: ctx.message.text,
        session_id: ctx.session.id,
        policy_profile: ctx.workspace.policy_profile,
      });
      return {
        ...ctx,
        message: { ...ctx.message, text: masked.masked_text },
      };
    } catch (err) {
      if (err instanceof AnonymizerUnavailableError) {
        if (ctx.workspace.policy_profile === "permissive") {
          log("pre_user_message:fail-open", ctx.request_id, {
            reason: "anonymizer_offline",
            profile: "permissive",
          });
          return ctx;
        }
        log("pre_user_message:fail-closed", ctx.request_id, {
          reason: "anonymizer_offline",
          profile: ctx.workspace.policy_profile,
        });
      }
      throw err;
    }
  };
}
