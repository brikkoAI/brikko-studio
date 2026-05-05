/**
 * Unit tests for `api/onboarding.ts` — validation + REST wrappers.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ackDisclaimer,
  createWorkspace,
  finalizeOnboarding,
  saveLlmProvider,
  validateWorkspaceName,
} from "../../src/api/onboarding.js";

describe("validateWorkspaceName", () => {
  it.each([
    ["personal", null],
    ["my-team_42", null],
    ["A".repeat(64), null],
  ])("accepts %s", (name, expected) => {
    expect(validateWorkspaceName(name)).toBe(expected);
  });

  it.each([
    [""],
    ["   "],
    ["with space"],
    ["слова"],
    ["punct!"],
    ["A".repeat(65)],
  ])("rejects %s", (name) => {
    expect(validateWorkspaceName(name)).not.toBeNull();
  });
});

describe("onboarding REST wrappers", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    (globalThis as unknown as { fetch: typeof fetch }).fetch = originalFetch;
  });

  it("createWorkspace POSTs JSON to /api/onboarding/create-workspace", async () => {
    const spy = vi.fn(
      async (
        _input: RequestInfo | URL,
        init?: RequestInit,
      ): Promise<Response> => {
        expect(init?.method).toBe("POST");
        expect(JSON.parse(String(init?.body ?? "{}"))).toEqual({
          name: "team",
        });
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: "ws_1",
            name: "team",
            key_fingerprint: "sha256:abc",
          }),
          text: async () => "",
        } as Response;
      },
    );
    (globalThis as unknown as { fetch: typeof fetch }).fetch =
      spy as unknown as typeof fetch;

    const r = await createWorkspace({ name: "team" });
    expect(r.id).toBe("ws_1");
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("saveLlmProvider sends BYO payload as-is", async () => {
    let captured: { url: string; body: unknown } | null = null;
    const spy = vi.fn(
      async (
        input: RequestInfo | URL,
        init?: RequestInit,
      ): Promise<Response> => {
        captured = {
          url: typeof input === "string" ? input : input.toString(),
          body: JSON.parse(String(init?.body ?? "null")) as unknown,
        };
        return { ok: true, status: 204, text: async () => "" } as Response;
      },
    );
    (globalThis as unknown as { fetch: typeof fetch }).fetch =
      spy as unknown as typeof fetch;

    await saveLlmProvider({
      kind: "byo",
      provider: "openai",
      api_key: "sk-test",
    });
    expect(captured?.url).toContain("/api/onboarding/llm-provider");
    expect(captured?.body).toEqual({
      kind: "byo",
      provider: "openai",
      api_key: "sk-test",
    });
  });

  it("ackDisclaimer + finalizeOnboarding throw when server is unhappy", async () => {
    const spy = vi.fn(
      async (): Promise<Response> =>
        ({
          ok: false,
          status: 503,
          text: async () => "down",
        }) as Response,
    );
    (globalThis as unknown as { fetch: typeof fetch }).fetch =
      spy as unknown as typeof fetch;

    await expect(ackDisclaimer()).rejects.toThrow(/disclaimer-ack failed/);
    await expect(finalizeOnboarding()).rejects.toThrow(/finalize failed/);
  });
});
