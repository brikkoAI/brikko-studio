import { describe, it, expect } from "vitest";
import plugin from "../../src/index.js";
import type { MemoryWriteContext } from "../../src/types.js";

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

  it("pre_user_message is callable on the default plugin instance", () => {
    // M2 Task 4 wired this hook to the anonymizer sidecar; behavior is
    // covered in tests/integration/pre-user-message.test.ts where MSW
    // stands in for the sidecar. Here we only verify the symbol exists
    // on the default export so the OpenClaw loader can mount it.
    expect(typeof plugin.hooks.pre_user_message).toBe("function");
  });

  it("post_llm_response is callable on the default plugin instance", () => {
    // M2 Task 5 wired this hook to the anonymizer's /restore endpoint;
    // behavior is covered in tests/integration/post-llm-response.test.ts
    // where MSW stands in for the sidecar. Here we only verify the symbol
    // exists on the default export so the OpenClaw loader can mount it.
    expect(typeof plugin.hooks.post_llm_response).toBe("function");
  });

  it("pre_tool_call is callable on the default plugin instance", () => {
    // M2 Task 8 wired this hook to the tool-policy table + anonymizer's
    // /tool_call/deanonymize endpoint; behaviour is covered in
    // tests/integration/pre-tool-call.test.ts where MSW + a fixture YAML
    // stand in for the sidecar and the policy file. Here we only verify
    // the symbol exists on the default export so the OpenClaw loader can
    // mount it.
    expect(typeof plugin.hooks.pre_tool_call).toBe("function");
  });

  it("post_tool_result is callable on the default plugin instance", () => {
    // M2 Task 9 wired this hook to AnonymizerClient.anonymize via reMaskTree;
    // behaviour is covered in tests/integration/post-tool-result.test.ts
    // where MSW stands in for the sidecar. Here we only verify the symbol
    // exists on the default export so the OpenClaw loader can mount it.
    expect(typeof plugin.hooks.post_tool_result).toBe("function");
  });

  it("pre_llm_call is callable on the default plugin instance", () => {
    // M2 Task 10 wired this hook to AnonymizerClient.anonymize as the
    // defence-in-depth final guard; behaviour is covered in
    // tests/integration/pre-llm-call.test.ts where MSW stands in for the
    // sidecar. Here we only verify the symbol exists on the default
    // export so the OpenClaw loader can mount it.
    expect(typeof plugin.hooks.pre_llm_call).toBe("function");
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

  it("post_llm_response_stream is callable on the default plugin instance", () => {
    // M2 Task 6 wired this hook to StreamRestorer; behavior is covered in
    // tests/unit/stream-restorer.test.ts and
    // tests/integration/post-llm-response-stream.test.ts where MSW stands
    // in for the sidecar. Here we only verify the symbol exists on the
    // default export so the OpenClaw loader can mount it.
    expect(typeof plugin.hooks.post_llm_response_stream).toBe("function");
  });
});
