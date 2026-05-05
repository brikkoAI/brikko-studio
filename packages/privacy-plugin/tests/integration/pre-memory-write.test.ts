import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setupServer } from "msw/node";
import { resolve } from "node:path";
import { handlers, ANON_BASE } from "../mocks/anonymizer-handlers.js";
import { createPlugin } from "../../src/plugin.js";
import type { MemoryWriteContext } from "../../src/types.js";

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

const ctx = (content: string): MemoryWriteContext => ({
  workspace: { id: "ws_test", policy_profile: "balanced" },
  session: { id: "ses_1" },
  request_id: "req_abc",
  memory: { content, key: "client_pref_X" },
});

describe("pre_memory_write hook", () => {
  it("masks PII in content before persisting", async () => {
    const out = await plugin.hooks.pre_memory_write(
      ctx("Иванову нравится синий цвет, ИНН 7707083893"),
    );
    expect(out!.memory.content).toContain("<NAME_1>");
    expect(out!.memory.content).toContain("<INN_1>");
    expect(out!.memory.content).not.toContain("Иванову");
  });

  it("does not mask the memory key (key is structural, not free text)", async () => {
    const out = await plugin.hooks.pre_memory_write(
      ctx("Иванову 7707083893"),
    );
    expect(out!.memory.key).toBe("client_pref_X");
  });

  it("aborts (throws) when anonymizer is offline (cannot risk leaking to disk)", async () => {
    // Use a guaranteed-unreachable anonymizer for this case.
    const offlinePlugin = createPlugin({
      anonymizerUrl: "http://127.0.0.1:1",
      requestTimeoutMs: 250,
      circuitBreakerMs: 30_000,
      toolPoliciesPath: FIXTURE,
      debugLogging: false,
      maxRetries: 1,
      retryBaseDelayMs: 0,
    });
    await expect(
      offlinePlugin.hooks.pre_memory_write(ctx("Иванову 7707083893")),
    ).rejects.toThrow(/Anonymizer/i);
  });
});
