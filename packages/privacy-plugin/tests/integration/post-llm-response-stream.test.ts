/**
 * Integration tests for the post_llm_response_stream hook.
 *
 * The hook wraps the LLM's text-delta AsyncIterable in StreamRestorer
 * (covered in unit tests), so here we only verify the wiring:
 *   - hook returns a context with a stream that yields restored chunks
 *   - identity fields (workspace, session, request_id) survive
 */
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { createPlugin } from "../../src/plugin.js";
import type { LlmStreamContext } from "../../src/types.js";

const ANON_BASE = "http://anonymizer:8403";

const server = setupServer(
  http.post(`${ANON_BASE}/restore_stream`, async ({ request }) => {
    const body = await request.text();
    const lines = body.split("\n").filter(Boolean);
    const chunks: string[] = [];
    for (const line of lines) {
      const evt = JSON.parse(line);
      if (evt.type === "chunk") chunks.push(evt.text);
    }
    const restored = chunks
      .join("")
      .replace(/<NAME_1>/g, "Иванову")
      .replace(/<INN_1>/g, "7707083893");
    const ndjson =
      JSON.stringify({ type: "chunk", text: restored }) +
      "\n" +
      JSON.stringify({ type: "end", hallucinated: [] }) +
      "\n";
    return new HttpResponse(ndjson, {
      status: 200,
      headers: { "content-type": "application/x-ndjson" },
    });
  }),
);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const plugin = createPlugin({
  anonymizerUrl: ANON_BASE,
  requestTimeoutMs: 5000,
  circuitBreakerMs: 30_000,
  toolPoliciesPath: "/dev/null",
  debugLogging: false,
  maxRetries: 1,
  retryBaseDelayMs: 5,
});

async function* gen(items: string[]): AsyncIterable<string> {
  for (const i of items) yield i;
}

describe("post_llm_response_stream hook", () => {
  it("wraps the source AsyncIterable and yields restored chunks", async () => {
    const ctx: LlmStreamContext = {
      workspace: { id: "ws_test", policy_profile: "balanced" },
      session: { id: "ses_1" },
      request_id: "req_abc",
      stream: gen(["Передам <NAME_1>", " о <INN_1>"]),
    };
    const out = await plugin.hooks.post_llm_response_stream(ctx);
    expect(out).not.toBeNull();
    const collected: string[] = [];
    for await (const chunk of out!.stream) collected.push(chunk);
    expect(collected.join("")).toBe("Передам Иванову о 7707083893");
  });

  it("preserves workspace, session, and request_id on output", async () => {
    const ctx: LlmStreamContext = {
      workspace: { id: "ws_42", policy_profile: "strict" },
      session: { id: "ses_99", task_id: "task_1" },
      request_id: "req_xyz",
      stream: gen(["hello"]),
    };
    const out = await plugin.hooks.post_llm_response_stream(ctx);
    expect(out!.workspace.id).toBe("ws_42");
    expect(out!.workspace.policy_profile).toBe("strict");
    expect(out!.session.id).toBe("ses_99");
    expect(out!.session.task_id).toBe("task_1");
    expect(out!.request_id).toBe("req_xyz");
    // Drain the stream so the test doesn't dangle the request body.
    for await (const _ of out!.stream) void _;
  });
});
