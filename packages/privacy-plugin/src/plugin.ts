import type {
  BrikkoPrivacyPluginExports,
  HookResult,
  LlmResponseContext,
  LlmStreamContext,
  MemoryWriteContext,
  MessageContext,
  ToolCallContext,
  ToolResultContext,
} from "./types.js";

const VERSION = "0.3.0";

/**
 * Scaffold plugin — every hook is identity + log.
 *
 * Subsequent M2 tasks (4-10) replace each `return ctx;` with the real
 * anonymizer-backed implementation. This file is the source of truth for
 * the plugin's external shape; do not move the hook signatures elsewhere.
 */
export const plugin: BrikkoPrivacyPluginExports = {
  name: "brikko-privacy",
  version: VERSION,
  hooks: {
    async pre_user_message(
      ctx: MessageContext,
    ): Promise<HookResult<MessageContext>> {
      log("pre_user_message", ctx.request_id, {
        textLen: ctx.message.text.length,
      });
      return ctx;
    },
    async post_llm_response(
      ctx: LlmResponseContext,
    ): Promise<HookResult<LlmResponseContext>> {
      log("post_llm_response", ctx.request_id, {
        textLen: ctx.response.text.length,
      });
      return ctx;
    },
    async post_llm_response_stream(
      ctx: LlmStreamContext,
    ): Promise<HookResult<LlmStreamContext>> {
      log("post_llm_response_stream", ctx.request_id, {});
      return ctx;
    },
    async pre_tool_call(
      ctx: ToolCallContext,
    ): Promise<HookResult<ToolCallContext>> {
      log("pre_tool_call", ctx.request_id, {
        tool: ctx.tool.name,
        trust: ctx.trust,
      });
      return ctx;
    },
    async post_tool_result(
      ctx: ToolResultContext,
    ): Promise<HookResult<ToolResultContext>> {
      log("post_tool_result", ctx.request_id, { tool: ctx.tool.name });
      return ctx;
    },
    async pre_llm_call(
      ctx: MessageContext,
    ): Promise<HookResult<MessageContext>> {
      log("pre_llm_call", ctx.request_id, {
        textLen: ctx.message.text.length,
      });
      return ctx;
    },
    async pre_memory_write(
      ctx: MemoryWriteContext,
    ): Promise<HookResult<MemoryWriteContext>> {
      log("pre_memory_write", ctx.request_id, { key: ctx.memory.key });
      return ctx;
    },
  },
};

/** Debug-only logger; no-op unless BRIKKO_PLUGIN_DEBUG=1 in env. */
function log(
  hook: string,
  requestId: string,
  fields: Record<string, unknown>,
): void {
  if (process.env["BRIKKO_PLUGIN_DEBUG"] === "1") {
    // eslint-disable-next-line no-console -- intentional debug channel
    console.log(
      `[brikko-privacy] hook=${hook} request_id=${requestId} ${JSON.stringify(fields)}`,
    );
  }
}
