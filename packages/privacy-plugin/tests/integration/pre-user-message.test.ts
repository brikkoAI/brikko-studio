/**
 * Integration tests for the pre_user_message hook.
 *
 * Wiring: createPlugin(cfg) constructs a real AnonymizerClient against an
 * MSW-mocked sidecar. We verify the hook (a) masks PII via the sidecar,
 * (b) preserves identity fields, (c) honors policy-profile fallback when
 * the sidecar is offline.
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
import type { MessageContext, PolicyProfile } from "../../src/types.js";

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

const baseCtx = (
  text: string,
  profile: PolicyProfile = "balanced",
): MessageContext => ({
  workspace: { id: "ws_test", policy_profile: profile },
  session: { id: "ses_1" },
  request_id: "req_abc",
  message: { text, channel: "web" },
});

describe("pre_user_message hook", () => {
  it("masks Russian PII in the user message before forwarding to LLM", async () => {
    const ctx = baseCtx("Передай Иванову ИНН 7707083893");
    const out = await plugin.hooks.pre_user_message(ctx);
    expect(out).not.toBeNull();
    expect(out!.message.text).toContain("<NAME_1>");
    expect(out!.message.text).toContain("<INN_1>");
    expect(out!.message.text).not.toContain("Иванову");
    expect(out!.message.text).not.toContain("7707083893");
  });

  it("passes through text with no PII unchanged", async () => {
    const ctx = baseCtx("Привет мир");
    const out = await plugin.hooks.pre_user_message(ctx);
    expect(out!.message.text).toBe("Привет мир");
  });

  it("preserves workspace, session, and request_id on output", async () => {
    const ctx = baseCtx("Передай Иванову ИНН 7707083893");
    const out = await plugin.hooks.pre_user_message(ctx);
    expect(out!.workspace.id).toBe("ws_test");
    expect(out!.workspace.policy_profile).toBe("balanced");
    expect(out!.session.id).toBe("ses_1");
    expect(out!.request_id).toBe("req_abc");
    expect(out!.message.channel).toBe("web");
  });

  it("blocks the request (throws) when anonymizer is offline AND profile=strict", async () => {
    server.use(
      http.post(`${ANON_BASE}/anonymize`, () => HttpResponse.error()),
    );
    const ctx = baseCtx("Иванов 7707083893", "strict");
    await expect(plugin.hooks.pre_user_message(ctx)).rejects.toThrow(
      /Anonymizer/i,
    );
  });

  it("blocks the request (throws) when anonymizer is offline AND profile=balanced", async () => {
    server.use(
      http.post(`${ANON_BASE}/anonymize`, () => HttpResponse.error()),
    );
    const ctx = baseCtx("Иванов 7707083893", "balanced");
    await expect(plugin.hooks.pre_user_message(ctx)).rejects.toThrow(
      /Anonymizer/i,
    );
  });

  it("passes through (fail-open) when anonymizer is offline AND profile=permissive", async () => {
    server.use(
      http.post(`${ANON_BASE}/anonymize`, () => HttpResponse.error()),
    );
    const ctx = baseCtx("Иванов 7707083893", "permissive");
    const out = await plugin.hooks.pre_user_message(ctx);
    // Permissive: leak the original; the anonymizer audit log records the
    // degraded-mode entry on its own when the sidecar comes back online.
    expect(out).not.toBeNull();
    expect(out!.message.text).toBe("Иванов 7707083893");
  });
});
