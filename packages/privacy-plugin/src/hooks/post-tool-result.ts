import type { AnonymizerClient } from "../anonymizer-client.js";
import { reMaskTree } from "../re-mask.js";
import type { HookResult, ToolResultContext } from "../types.js";
import type { HookLogger } from "./pre-user-message.js";

/**
 * post_tool_result — recursively re-anonymize the MCP tool result before
 * it re-enters the LLM context.
 *
 * A trusted MCP (e.g. Bitrix24) was given de-anonymized arguments by
 * pre_tool_call and returned real PII in its response. To preserve the
 * placeholder discipline at the LLM boundary, every string in the result
 * tree is masked through the sidecar before the result is forwarded.
 *
 * The walk lives in `re-mask.ts`; this hook is the thin wiring layer.
 *
 * Failure mode: any sidecar error propagates. Unlike post_llm_response
 * which fails open (better to show placeholders than block a response),
 * post_tool_result fails closed: a tool result containing real PII MUST
 * NOT reach the LLM if the anonymizer is unhealthy.
 */
export function makePostToolResultHook(
  client: AnonymizerClient,
  log: HookLogger,
) {
  return async function postToolResult(
    ctx: ToolResultContext,
  ): Promise<HookResult<ToolResultContext>> {
    log("post_tool_result", ctx.request_id, { tool: ctx.tool.name });
    const remasked = await reMaskTree(ctx.tool.result, {
      client,
      workspaceId: ctx.workspace.id,
      requestId: ctx.request_id,
    });
    return { ...ctx, tool: { ...ctx.tool, result: remasked } };
  };
}
