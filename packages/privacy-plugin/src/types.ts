/**
 * Public types for @brikko/privacy-plugin.
 *
 * These types mirror the upstream OpenClaw plugin contract documented in
 * `docs/plugin-architecture.md` (M2 Task 1). They are intentionally
 * standalone (not re-exported from @brikko/studio-core) so the test suite
 * can run without the full Studio Core build artifact.
 *
 * If upstream's hook-types.ts evolves, update this file FIRST and let the
 * type errors guide the cascade.
 */

/** Workspace-level policy profile that drives PII detection strictness. */
export type PolicyProfile = "strict" | "balanced" | "permissive";

export interface WorkspaceRef {
  id: string;
  policy_profile: PolicyProfile;
}

export interface SessionRef {
  id: string;
  task_id?: string;
}

export interface MessageContext {
  workspace: WorkspaceRef;
  session: SessionRef;
  request_id: string;
  message: { text: string; channel: "web" | "telegram" | "cli" | string };
}

export interface LlmResponseContext {
  workspace: WorkspaceRef;
  session: SessionRef;
  request_id: string;
  response: { text: string };
}

export interface LlmStreamContext {
  workspace: WorkspaceRef;
  session: SessionRef;
  request_id: string;
  /** Stream of textual chunks from the LLM (placeholders, not yet restored). */
  stream: AsyncIterable<string>;
}

export interface ToolCallContext {
  workspace: WorkspaceRef;
  session: SessionRef;
  request_id: string;
  tool: { name: string; args: Record<string, unknown> };
  /** "trusted" tools may be de-anonymized; "untrusted" must keep placeholders. */
  trust: "trusted" | "untrusted";
}

export interface ToolResultContext {
  workspace: WorkspaceRef;
  session: SessionRef;
  request_id: string;
  tool: { name: string; result: unknown };
}

export interface MemoryWriteContext {
  workspace: WorkspaceRef;
  session: SessionRef;
  request_id: string;
  memory: { content: string; key: string };
}

/**
 * Hook handler return type: either a (possibly mutated) context, or `null`
 * to abort the pipeline (e.g. trust-policy denial).
 */
export type HookResult<T> = T | null;

/**
 * Public surface of the Brikko Privacy plugin.
 *
 * NOTE: this is the *Brikko-spec* shape (six conceptual hooks plus a stream
 * variant), NOT the upstream OpenClaw `OpenClawPluginDefinition` shape.
 * The bridge from this surface to upstream's `api.on(hookName, handler)`
 * lives in `extensions/brikko-privacy/index.ts` (Task 11+).
 */
export interface BrikkoPrivacyPluginExports {
  name: "brikko-privacy";
  version: string;
  hooks: {
    pre_user_message(ctx: MessageContext): Promise<HookResult<MessageContext>>;
    post_llm_response(
      ctx: LlmResponseContext,
    ): Promise<HookResult<LlmResponseContext>>;
    post_llm_response_stream(
      ctx: LlmStreamContext,
    ): Promise<HookResult<LlmStreamContext>>;
    pre_tool_call(ctx: ToolCallContext): Promise<HookResult<ToolCallContext>>;
    post_tool_result(
      ctx: ToolResultContext,
    ): Promise<HookResult<ToolResultContext>>;
    pre_llm_call(ctx: MessageContext): Promise<HookResult<MessageContext>>;
    pre_memory_write(
      ctx: MemoryWriteContext,
    ): Promise<HookResult<MemoryWriteContext>>;
  };
}
