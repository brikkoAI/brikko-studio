import { restoreStream } from "../stream-restorer.js";
import type { PluginConfig } from "../config.js";
import type { HookResult, LlmStreamContext } from "../types.js";
import type { HookLogger } from "./pre-user-message.js";

/**
 * post_llm_response_stream — streaming variant of post_llm_response.
 *
 * The hook returns immediately with a wrapped AsyncIterable. Actual
 * sidecar I/O happens lazily as the consumer pulls chunks. If the
 * sidecar is offline, the error surfaces on the *first* `for await`
 * iteration, not on this hook's return — that matches OpenClaw's
 * stream-context contract.
 *
 * Trade-off vs blocking-buffer-then-restore: we keep streaming UX
 * (first-token-latency stays low) at the cost of a per-request
 * connection to the sidecar. The carry-buffer logic in StreamRestorer
 * keeps the wire safe from fragmented placeholders.
 */
export function makePostLlmResponseStreamHook(
  cfg: PluginConfig,
  log: HookLogger,
) {
  return async function postLlmResponseStream(
    ctx: LlmStreamContext,
  ): Promise<HookResult<LlmStreamContext>> {
    log("post_llm_response_stream", ctx.request_id, {
      profile: ctx.workspace.policy_profile,
    });
    return {
      ...ctx,
      stream: restoreStream({
        cfg,
        workspaceId: ctx.workspace.id,
        requestId: ctx.request_id,
        source: ctx.stream,
      }),
    };
  };
}
