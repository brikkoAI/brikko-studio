import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { resolve } from "node:path";
import { handlers, ANON_BASE } from "../mocks/anonymizer-handlers.js";
import { createPlugin } from "../../src/plugin.js";
import type { ToolResultContext } from "../../src/types.js";

// Custom /anonymize handler that handles arbitrary surface PII (the canned
// handler in mocks/anonymizer-handlers.ts only reacts to a single fixture
// string). Re-masking walks the entire result tree, so we need broader
// coverage than the canned handler provides.
const remaskAnonymize = http.post(
  `${ANON_BASE}/anonymize`,
  async ({ request }) => {
    const body = (await request.json()) as {
      text: string;
      workspace_id: string;
      request_id: string;
      policy_profile?: string;
      session_id?: string;
    };
    let masked = body.text;
    const entities: Array<{
      placeholder: string;
      category: string;
      confidence: number;
    }> = [];
    if (/Иванов\w*/u.test(masked)) {
      masked = masked.replace(/Иванов\w*/gu, "<NAME_1>");
      entities.push({
        placeholder: "<NAME_1>",
        category: "PERSON",
        confidence: 0.92,
      });
    }
    if (/7707083893/.test(masked)) {
      masked = masked.replace(/7707083893/g, "<INN_1>");
      entities.push({
        placeholder: "<INN_1>",
        category: "INN",
        confidence: 1.0,
      });
    }
    return HttpResponse.json({
      masked_text: masked,
      entities,
      request_id: body.request_id,
      degraded_mode: false,
      latency_ms: 5,
    });
  },
);

const server = setupServer(remaskAnonymize, ...handlers);
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

const baseCtx = (result: unknown): ToolResultContext => ({
  workspace: { id: "ws_test", policy_profile: "balanced" },
  session: { id: "ses_1" },
  request_id: "req_abc",
  tool: { name: "bitrix24.deals.list", result },
});

describe("post_tool_result hook", () => {
  it("re-masks string fields containing PII inside an object", async () => {
    const out = await plugin.hooks.post_tool_result(
      baseCtx({ id: 42, client_name: "Иванов с ИНН 7707083893" }),
    );
    expect(out!.tool.result).toMatchObject({ id: 42 });
    const result = out!.tool.result as { client_name: string };
    expect(result.client_name).toContain("<NAME_1>");
    expect(result.client_name).toContain("<INN_1>");
  });

  it("re-masks PII strings inside an array of objects", async () => {
    const out = await plugin.hooks.post_tool_result(
      baseCtx([
        { id: 1, summary: "Иванову ИНН 7707083893" },
        { id: 2, summary: "Other client" },
      ]),
    );
    const arr = out!.tool.result as Array<{ id: number; summary: string }>;
    expect(arr[0].summary).toContain("<NAME_1>");
    expect(arr[1].summary).toBe("Other client");
  });

  it("preserves non-string scalars unchanged", async () => {
    const out = await plugin.hooks.post_tool_result(
      baseCtx({ count: 42, active: true, ratio: 0.95 }),
    );
    expect(out!.tool.result).toEqual({
      count: 42,
      active: true,
      ratio: 0.95,
    });
  });

  it("handles null and empty result", async () => {
    expect((await plugin.hooks.post_tool_result(baseCtx(null)))!.tool.result).toBeNull();
    expect(
      (await plugin.hooks.post_tool_result(baseCtx({})))!.tool.result,
    ).toEqual({});
  });
});
