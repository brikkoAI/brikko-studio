import { describe, it, expect } from "vitest";
import plugin from "../../src/index.js";
import type {
  MessageContext,
  LlmResponseContext,
  ToolCallContext,
  ToolResultContext,
  MemoryWriteContext,
} from "../../src/types.js";

const ws = { id: "ws_test", policy_profile: "balanced" as const };
const ses = { id: "ses_1" };
const reqId = "req_abc";

describe("BrikkoPrivacyPlugin lifecycle (scaffold — no logic yet)", () => {
  it("exports name 'brikko-privacy' and a SemVer version", () => {
    expect(plugin.name).toBe("brikko-privacy");
    expect(plugin.version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("exposes all 7 required hooks (6 from spec + stream variant)", () => {
    expect(typeof plugin.hooks.pre_user_message).toBe("function");
    expect(typeof plugin.hooks.post_llm_response).toBe("function");
    expect(typeof plugin.hooks.post_llm_response_stream).toBe("function");
    expect(typeof plugin.hooks.pre_tool_call).toBe("function");
    expect(typeof plugin.hooks.post_tool_result).toBe("function");
    expect(typeof plugin.hooks.pre_llm_call).toBe("function");
    expect(typeof plugin.hooks.pre_memory_write).toBe("function");
  });

  it("pre_user_message returns the context unchanged in scaffold mode", async () => {
    const ctx: MessageContext = {
      workspace: ws,
      session: ses,
      request_id: reqId,
      message: { text: "hello", channel: "web" },
    };
    expect(await plugin.hooks.pre_user_message(ctx)).toEqual(ctx);
  });

  it("post_llm_response returns the context unchanged in scaffold mode", async () => {
    const ctx: LlmResponseContext = {
      workspace: ws,
      session: ses,
      request_id: reqId,
      response: { text: "answer" },
    };
    expect(await plugin.hooks.post_llm_response(ctx)).toEqual(ctx);
  });

  it("pre_tool_call returns the context unchanged in scaffold mode", async () => {
    const ctx: ToolCallContext = {
      workspace: ws,
      session: ses,
      request_id: reqId,
      tool: { name: "bitrix24.deals.list", args: { client: "X" } },
      trust: "trusted",
    };
    expect(await plugin.hooks.pre_tool_call(ctx)).toEqual(ctx);
  });

  it("post_tool_result returns the context unchanged in scaffold mode", async () => {
    const ctx: ToolResultContext = {
      workspace: ws,
      session: ses,
      request_id: reqId,
      tool: { name: "bitrix24.deals.list", result: [{ id: 1 }] },
    };
    expect(await plugin.hooks.post_tool_result(ctx)).toEqual(ctx);
  });

  it("pre_llm_call returns the context unchanged in scaffold mode", async () => {
    const ctx: MessageContext = {
      workspace: ws,
      session: ses,
      request_id: reqId,
      message: { text: "prompt for llm", channel: "cli" },
    };
    expect(await plugin.hooks.pre_llm_call(ctx)).toEqual(ctx);
  });

  it("pre_memory_write returns the context unchanged in scaffold mode", async () => {
    const ctx: MemoryWriteContext = {
      workspace: ws,
      session: ses,
      request_id: reqId,
      memory: { content: "client X likes blue", key: "client_pref_X" },
    };
    expect(await plugin.hooks.pre_memory_write(ctx)).toEqual(ctx);
  });

  it("post_llm_response_stream returns the context unchanged in scaffold mode", async () => {
    async function* gen(): AsyncIterable<string> {
      yield "chunk1";
    }
    const ctx = {
      workspace: ws,
      session: ses,
      request_id: reqId,
      stream: gen(),
    };
    const out = await plugin.hooks.post_llm_response_stream(ctx);
    expect(out).toBe(ctx);
  });
});
