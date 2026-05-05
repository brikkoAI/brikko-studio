/**
 * End-to-end integration: drive every hook against MSW-mocked anonymizer
 * + a synthetic LLM, exercise spec Scenario 2 (chat round-trip) and a
 * tool-call segment, assert mask/restore symmetry across the whole
 * pipeline.
 *
 * This is the M2 acceptance test for the privacy plugin — if it goes red
 * after a refactor, the contract has been broken even if individual unit
 * tests still pass.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setupServer } from "msw/node";
import { resolve } from "node:path";
import { handlers, ANON_BASE } from "../mocks/anonymizer-handlers.js";
import { createPlugin } from "../../src/plugin.js";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const FIXTURE = resolve(__dirname, "../fixtures/tool-policies.yaml");
const plugin = createPlugin({
  anonymizerUrl: ANON_BASE,
  requestTimeoutMs: 2000,
  circuitBreakerMs: 30_000,
  toolPoliciesPath: FIXTURE,
  debugLogging: false,
  maxRetries: 1,
  retryBaseDelayMs: 0,
});

/** Synthetic LLM that echoes the masked prompt verbatim — perfect for round-trip checks. */
async function mockLlm(maskedPrompt: string): Promise<string> {
  return `Понял: ${maskedPrompt}`;
}

const baseRefs = {
  workspace: { id: "ws_test", policy_profile: "balanced" as const },
  session: { id: "ses_1" },
};

describe("E2E Scenario 2 — chat round-trip without tool-call", () => {
  it("masks user → echoes through LLM → restores response", async () => {
    const userText = "Передай Иванову ИНН 7707083893";

    // 1. pre_user_message: anonymize before LLM sees the prompt.
    const masked = await plugin.hooks.pre_user_message({
      ...baseRefs,
      request_id: "req_001",
      message: { text: userText, channel: "web" },
    });
    expect(masked!.message.text).not.toContain("Иванов");
    expect(masked!.message.text).not.toContain("7707083893");
    expect(masked!.message.text).toContain("<NAME_1>");

    // 2. pre_llm_call: defence in depth on the assembled prompt. Already
    // masked, so the hook should find no entities and pass through.
    const finalised = await plugin.hooks.pre_llm_call(masked!);
    expect(finalised!.message.text).toBe(masked!.message.text);

    // 3. (mock) call LLM with the masked prompt.
    const llmResponse = await mockLlm(finalised!.message.text);

    // 4. post_llm_response: restore placeholders to originals before the
    // user (or downstream tools) see the response.
    const restored = await plugin.hooks.post_llm_response({
      ...baseRefs,
      request_id: "req_001",
      response: { text: llmResponse },
    });
    expect(restored!.response.text).toContain("Иванову");
    expect(restored!.response.text).toContain("7707083893");
    expect(restored!.response.text).not.toContain("<NAME_1>");
    expect(restored!.response.hallucinated).toBeUndefined();
  });
});

describe("E2E full pipeline — tool-call branch + memory write", () => {
  it("fires all six hooks in realistic order with correct state flow", async () => {
    // Step 1: user message arrives with PII.
    const userText = "Передай Иванову ИНН 7707083893";
    const afterPreUser = await plugin.hooks.pre_user_message({
      ...baseRefs,
      request_id: "req_full",
      message: { text: userText, channel: "web" },
    });
    expect(afterPreUser!.message.text).toContain("<NAME_1>");

    // Step 2: defence-in-depth final check on assembled LLM prompt.
    const afterPreLlm = await plugin.hooks.pre_llm_call(afterPreUser!);
    expect(afterPreLlm!.message.text).toBe(afterPreUser!.message.text);

    // Step 3: LLM decides to call a trusted MCP tool with placeholder
    // args. pre_tool_call deanonymizes for trusted bitrix24.* tools.
    const afterPreTool = await plugin.hooks.pre_tool_call({
      ...baseRefs,
      request_id: "req_full",
      tool: {
        name: "bitrix24.deals.list",
        args: { client: "<NAME_1>", period: "Q1-2026" },
      },
      trust: "trusted",
    });
    expect(afterPreTool!.tool.args["client"]).toBe("Иванов Иван Петрович");

    // Step 4: tool runs and returns real PII in its response. The hook
    // re-masks every text-bearing string before the result re-enters
    // the LLM context.
    const afterPostTool = await plugin.hooks.post_tool_result({
      ...baseRefs,
      request_id: "req_full",
      tool: {
        name: "bitrix24.deals.list",
        result: [
          { id: 42, summary: "Иванову ИНН 7707083893" },
          { id: 43, summary: "Other deal" },
        ],
      },
    });
    const remasked = afterPostTool!.tool.result as Array<{
      id: number;
      summary: string;
    }>;
    expect(remasked[0].summary).toContain("<NAME_1>");
    expect(remasked[0].summary).not.toContain("Иванову");
    expect(remasked[1].summary).toBe("Other deal");

    // Step 5: LLM produces a final response containing placeholders.
    const llmResponse = await mockLlm("сделка с <NAME_1>, ИНН <INN_1>");
    const afterPostLlm = await plugin.hooks.post_llm_response({
      ...baseRefs,
      request_id: "req_full",
      response: { text: llmResponse },
    });
    expect(afterPostLlm!.response.text).toContain("Иванову");
    expect(afterPostLlm!.response.text).toContain("7707083893");

    // Step 6: agent decides to persist a memory note. The content gets
    // anonymized fail-closed before it lands on disk; the structural
    // key passes through unchanged.
    const afterPreMemory = await plugin.hooks.pre_memory_write({
      ...baseRefs,
      request_id: "req_full",
      memory: {
        content: "Иванову нравится синий, ИНН 7707083893",
        key: "client_pref_42",
      },
    });
    expect(afterPreMemory!.memory.content).toContain("<NAME_1>");
    expect(afterPreMemory!.memory.content).not.toContain("Иванову");
    expect(afterPreMemory!.memory.key).toBe("client_pref_42");
  });

  it("propagates trust boundary: deny verdict aborts the pipeline at pre_tool_call", async () => {
    await expect(
      plugin.hooks.pre_tool_call({
        ...baseRefs,
        request_id: "req_deny",
        tool: { name: "third_party_ai.send", args: { msg: "<NAME_1>" } },
        trust: "trusted",
      }),
    ).rejects.toThrow(/denied by policy/i);
  });
});
