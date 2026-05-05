/**
 * Integration tests for the post_llm_response hook (non-streaming).
 *
 * Covers:
 *   - Restore known placeholders to their original surface forms.
 *   - Pass-through of clean text.
 *   - Hallucination tagging (LLM emits a placeholder we never minted).
 *   - Fail-open on sidecar outage (return raw placeholder; UI shows toast).
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
import { handlers, ANON_BASE } from "../mocks/anonymizer-handlers.js";
import { createPlugin } from "../../src/plugin.js";
import type { LlmResponseContext } from "../../src/types.js";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const plugin = createPlugin({
  anonymizerUrl: ANON_BASE,
  requestTimeoutMs: 1000,
  circuitBreakerMs: 30_000,
  toolPoliciesPath: "/dev/null",
  debugLogging: false,
  maxRetries: 1,
  retryBaseDelayMs: 5,
});

const ctx = (text: string): LlmResponseContext => ({
  workspace: { id: "ws_test", policy_profile: "balanced" },
  session: { id: "ses_1" },
  request_id: "req_abc",
  response: { text },
});

describe("post_llm_response hook (non-stream)", () => {
  it("restores known placeholders to original surface forms", async () => {
    const out = await plugin.hooks.post_llm_response(
      ctx("Передам <NAME_1> о <INN_1>"),
    );
    expect(out).not.toBeNull();
    expect(out!.response.text).toBe("Передам Иванову о 7707083893");
  });

  it("returns text unchanged when no placeholders present", async () => {
    const out = await plugin.hooks.post_llm_response(ctx("Привет"));
    expect(out!.response.text).toBe("Привет");
    expect(out!.response.hallucinated).toBeUndefined();
  });

  it("attaches hallucinated[] when anonymizer flags unknown placeholders", async () => {
    server.use(
      http.post(`${ANON_BASE}/restore`, async ({ request }) => {
        const body = (await request.json()) as {
          text: string;
          request_id: string;
        };
        return HttpResponse.json({
          restored_text: body.text,
          hallucinated: [{ placeholder: "<NAME_99>" }],
          request_id: body.request_id,
          latency_ms: 4,
        });
      }),
    );
    const out = await plugin.hooks.post_llm_response(
      ctx("Я также упомянул <NAME_99> для контекста"),
    );
    expect(out!.response.hallucinated).toEqual([
      { placeholder: "<NAME_99>" },
    ]);
  });

  it("omits hallucinated field when none are flagged", async () => {
    const out = await plugin.hooks.post_llm_response(
      ctx("Передам <NAME_1>"),
    );
    expect(out!.response.hallucinated).toBeUndefined();
  });

  it("fail-open when anonymizer is offline (leaks placeholder; UI surfaces toast)", async () => {
    server.use(
      http.post(`${ANON_BASE}/restore`, () => HttpResponse.error()),
    );
    const out = await plugin.hooks.post_llm_response(ctx("<NAME_1>"));
    expect(out).not.toBeNull();
    // Cannot restore → return placeholder as-is. The chat UI's Toast
    // component shows "Restore unavailable, raw placeholders shown."
    expect(out!.response.text).toBe("<NAME_1>");
    expect(out!.response.hallucinated).toBeUndefined();
  });

  it("preserves workspace, session, and request_id on output", async () => {
    const out = await plugin.hooks.post_llm_response(
      ctx("Передам <NAME_1>"),
    );
    expect(out!.workspace.id).toBe("ws_test");
    expect(out!.session.id).toBe("ses_1");
    expect(out!.request_id).toBe("req_abc");
  });
});
