import { AnonymizerClient } from "./anonymizer-client.js";
import { type PluginConfig, loadConfigFromEnv } from "./config.js";
import {
  type HookLogger,
  makePreUserMessageHook,
} from "./hooks/pre-user-message.js";
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

const VERSION = "0.3.0-m2";

/**
 * Build a plugin instance bound to a specific config + AnonymizerClient.
 *
 * The factory shape lets tests inject an MSW-mocked sidecar URL while the
 * default `plugin` export continues to read from process.env for the real
 * runtime (OpenClaw plugin loader).
 */
export function createPlugin(cfg: PluginConfig): BrikkoPrivacyPluginExports {
  const client = new AnonymizerClient(cfg);
  const log: HookLogger = (hook, requestId, fields) => {
    if (cfg.debugLogging) {
      // eslint-disable-next-line no-console -- intentional debug channel
      console.log(
        `[brikko-privacy] hook=${hook} request_id=${requestId} ${JSON.stringify(fields)}`,
      );
    }
  };

  const preUserMessage = makePreUserMessageHook(client, log);

  return {
    name: "brikko-privacy",
    version: VERSION,
    hooks: {
      pre_user_message: preUserMessage,

      // Identity hooks — replaced in subsequent M2 tasks.
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
}

/**
 * Default export — used by the OpenClaw plugin loader at runtime.
 * Reads configuration from process.env via loadConfigFromEnv().
 */
export const plugin: BrikkoPrivacyPluginExports = createPlugin(
  loadConfigFromEnv(),
);
