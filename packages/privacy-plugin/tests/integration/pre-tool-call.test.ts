import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setupServer } from "msw/node";
import { resolve } from "node:path";
import { handlers, ANON_BASE } from "../mocks/anonymizer-handlers.js";
import { createPlugin } from "../../src/plugin.js";
import { TrustViolationError } from "../../src/errors.js";
import type { ToolCallContext } from "../../src/types.js";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const FIXTURE = resolve(__dirname, "../fixtures/tool-policies.yaml");
const plugin = createPlugin({
  anonymizerUrl: ANON_BASE,
  requestTimeoutMs: 1000,
  circuitBreakerMs: 30_000,
  toolPoliciesPath: FIXTURE,
  debugLogging: false,
  maxRetries: 1,
  retryBaseDelayMs: 0,
});

const ctx = (
  toolName: string,
  args: Record<string, unknown>,
  trust: "trusted" | "untrusted" = "trusted",
): ToolCallContext => ({
  workspace: { id: "ws_test", policy_profile: "balanced" },
  session: { id: "ses_1" },
  request_id: "req_abc",
  tool: { name: toolName, args },
  trust,
});

describe("pre_tool_call hook", () => {
  it("deanonymizes args for trusted MCP with policy=deanonymize", async () => {
    const out = await plugin.hooks.pre_tool_call(
      ctx("bitrix24.deals.list", {
        client: "<NAME_1>",
        period: "Q1-2026",
      }),
    );
    expect(out!.tool.args["client"]).toBe("Иванов Иван Петрович");
    expect(out!.tool.args["period"]).toBe("Q1-2026");
  });

  it("throws TrustViolationError for tools with deny policy", async () => {
    await expect(
      plugin.hooks.pre_tool_call(ctx("third_party_ai.send", { msg: "<NAME_1>" })),
    ).rejects.toBeInstanceOf(TrustViolationError);
  });

  it("keeps args anonymized for unregistered tool (deny-by-default fallback to '*')", async () => {
    const out = await plugin.hooks.pre_tool_call(
      ctx("unknown_mcp.do", { v: "<NAME_1>" }),
    );
    expect(out!.tool.args["v"]).toBe("<NAME_1>");
  });

  it("forces keep_anonymized when trust=untrusted, even for trusted-policy tool", async () => {
    const out = await plugin.hooks.pre_tool_call(
      ctx("bitrix24.deals.list", { client: "<NAME_1>" }, "untrusted"),
    );
    expect(out!.tool.args["client"]).toBe("<NAME_1>");
  });

  it("preserves args for per-field policy without changes (MVP — sensitivity filtering is M3)", async () => {
    const out = await plugin.hooks.pre_tool_call(
      ctx("email.send", { to: "<EMAIL_1>", body: "Hello" }),
    );
    expect(out!.tool.args["to"]).toBe("<EMAIL_1>");
    expect(out!.tool.args["body"]).toBe("Hello");
  });
});
