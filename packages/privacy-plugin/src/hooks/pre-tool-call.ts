import type { AnonymizerClient } from "../anonymizer-client.js";
import { TrustViolationError } from "../errors.js";
import {
  resolvePolicy,
  type ToolPolicyTable,
} from "../tool-policies.js";
import type { HookResult, ToolCallContext } from "../types.js";
import type { HookLogger } from "./pre-user-message.js";

/**
 * pre_tool_call — apply tool-policy table verdict before forwarding to MCP.
 *
 * Decision tree (per spec §4.3 + §4.5):
 *   1. Resolve `ctx.tool.name` against the policy table (loaded once at
 *      plugin startup).
 *   2. Verdict=`deny` → throw `TrustViolationError`. Upstream handler
 *      surfaces a "tool blocked by policy" notice to the user.
 *   3. `ctx.trust === "untrusted"` → force `keep_anonymized` regardless of
 *      policy. Defence-in-depth — even a misconfigured policy table cannot
 *      leak originals to an untrusted MCP.
 *   4. `args=deanonymize` → call `client.toolCallDeanonymize` to swap
 *      placeholders for real values inside `ctx.tool.args`.
 *   5. `args=keep_anonymized` or per-field policy → pass args unchanged.
 *      Per-field sensitivity filtering is M3 (tracked in M2_FOLLOWUPS).
 *
 * The hook never silently turns a deanonymize policy into keep_anonymized;
 * if the sidecar fails, the error propagates up so the orchestrator can
 * decide whether to retry. Tools that cannot be deanonymized must instead
 * be marked `keep_anonymized` in the YAML.
 */
export function makePreToolCallHook(
  client: AnonymizerClient,
  policiesPromise: Promise<ToolPolicyTable>,
  log: HookLogger,
) {
  return async function preToolCall(
    ctx: ToolCallContext,
  ): Promise<HookResult<ToolCallContext>> {
    log("pre_tool_call", ctx.request_id, {
      tool: ctx.tool.name,
      trust: ctx.trust,
    });
    const table = await policiesPromise;
    const verdict = resolvePolicy(table, ctx.tool.name);
    if (verdict.kind === "deny") {
      throw new TrustViolationError(ctx.tool.name, verdict.message);
    }
    if (ctx.trust === "untrusted") {
      // Untrusted MCPs always receive placeholders, regardless of policy.
      return ctx;
    }
    if (verdict.args === "deanonymize") {
      const out = await client.toolCallDeanonymize({
        workspace_id: ctx.workspace.id,
        request_id: ctx.request_id,
        tool_name: ctx.tool.name,
        args: ctx.tool.args,
        policy: "deanonymize",
      });
      return { ...ctx, tool: { ...ctx.tool, args: out.args } };
    }
    // keep_anonymized OR per-field object policy: leave args untouched.
    return ctx;
  };
}
