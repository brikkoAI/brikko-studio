import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setupServer } from "msw/node";
import { resolve } from "node:path";
import { handlers, ANON_BASE } from "../mocks/anonymizer-handlers.js";
import { createPlugin } from "../../src/plugin.js";
import type { MessageContext, PolicyProfile } from "../../src/types.js";

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
  text: string,
  profile: PolicyProfile = "balanced",
): MessageContext => ({
  workspace: { id: "ws_test", policy_profile: profile },
  session: { id: "ses_1" },
  request_id: "req_abc",
  message: { text, channel: "web" },
});

describe("pre_llm_call hook (defence in depth)", () => {
  it("masks any leaked PII in balanced profile and proceeds", async () => {
    const out = await plugin.hooks.pre_llm_call(
      ctx("Скрытое: Иванову 7707083893"),
    );
    expect(out!.message.text).toContain("<NAME_1>");
    expect(out!.message.text).toContain("<INN_1>");
  });

  it("returns text unchanged when no PII in any profile", async () => {
    expect(
      (await plugin.hooks.pre_llm_call(ctx("Привет", "strict")))!.message.text,
    ).toBe("Привет");
    expect(
      (await plugin.hooks.pre_llm_call(ctx("Привет", "balanced")))!.message
        .text,
    ).toBe("Привет");
    expect(
      (await plugin.hooks.pre_llm_call(ctx("Привет", "permissive")))!.message
        .text,
    ).toBe("Привет");
  });

  it("ABORTS the call (throws) in strict profile when PII is detected at this stage", async () => {
    await expect(
      plugin.hooks.pre_llm_call(ctx("LEAKED: Иванову 7707083893", "strict")),
    ).rejects.toThrow(/PII.*strict profile aborts/i);
  });

  it("passes through unchanged in permissive profile (with warning log only)", async () => {
    const out = await plugin.hooks.pre_llm_call(
      ctx("Иванову 7707083893", "permissive"),
    );
    expect(out!.message.text).toBe("Иванову 7707083893");
  });
});
