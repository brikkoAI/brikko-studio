/**
 * Tests for ToolPoliciesEditor — verify table rendering, dropdown changes,
 * trust badge styling, empty state, and that Save dispatches PUT.
 */
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { ToolPoliciesEditor } from "../../src/privacy/ToolPoliciesEditor.js";
import { withQueryClient } from "./test-utils.js";

const samplePolicies = [
  { pattern: "bitrix24.*", args: "deanonymize", result: "anonymize", trust: "trusted" },
  { pattern: "1c.*", args: "deanonymize", result: "anonymize", trust: "trusted" },
  { pattern: "web_search", args: "keep_anonymized", result: "anonymize", trust: "untrusted" },
];

interface FetchCall {
  url: string;
  method: string;
  body: string | null;
}

function makeFetchSpy(initial: { policies: typeof samplePolicies }) {
  const calls: FetchCall[] = [];
  let policies = initial;
  const spy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input.toString();
    const method = init?.method ?? "GET";
    const body = init?.body ? String(init.body) : null;
    calls.push({ url, method, body });
    if (method === "PUT" && body) {
      policies = JSON.parse(body) as typeof policies;
      return { ok: true, status: 200, json: async () => ({ ok: true }), text: async () => "" } as Response;
    }
    return {
      ok: true,
      status: 200,
      json: async () => policies,
      text: async () => JSON.stringify(policies),
    } as Response;
  });
  return { spy, calls };
}

describe("ToolPoliciesEditor", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    (globalThis as unknown as { fetch: typeof fetch }).fetch = originalFetch;
  });

  it("shows empty state when no policies", async () => {
    const { spy } = makeFetchSpy({ policies: [] });
    (globalThis as unknown as { fetch: typeof fetch }).fetch = spy as unknown as typeof fetch;
    withQueryClient(<ToolPoliciesEditor />);
    await waitFor(() => expect(screen.getByTestId("tool-policies-empty")).toBeInTheDocument());
  });

  it("renders one row per policy with correct trust badges", async () => {
    const { spy } = makeFetchSpy({ policies: samplePolicies });
    (globalThis as unknown as { fetch: typeof fetch }).fetch = spy as unknown as typeof fetch;
    withQueryClient(<ToolPoliciesEditor />);
    await waitFor(() => expect(screen.getByTestId("tool-policies-editor")).toBeInTheDocument());
    expect(screen.getByTestId("tool-policy-row-bitrix24.*")).toBeInTheDocument();
    expect(screen.getByTestId("tool-policy-row-1c.*")).toBeInTheDocument();
    expect(screen.getByTestId("tool-policy-row-web_search")).toBeInTheDocument();
    const badges = document.querySelectorAll(".trust-badge");
    expect(badges).toHaveLength(3);
    expect(document.querySelectorAll(".trust-trusted")).toHaveLength(2);
    expect(document.querySelectorAll(".trust-untrusted")).toHaveLength(1);
  });

  it("PUTs updated args/result on save", async () => {
    const { spy, calls } = makeFetchSpy({ policies: samplePolicies });
    (globalThis as unknown as { fetch: typeof fetch }).fetch = spy as unknown as typeof fetch;
    withQueryClient(<ToolPoliciesEditor />);
    await waitFor(() => expect(screen.getByTestId("tool-policies-editor")).toBeInTheDocument());

    const argsSel = screen.getByTestId("tool-args-bitrix24.*") as HTMLSelectElement;
    fireEvent.change(argsSel, { target: { value: "keep_anonymized" } });

    const resultSel = screen.getByTestId("tool-result-bitrix24.*") as HTMLSelectElement;
    fireEvent.change(resultSel, { target: { value: "passthrough" } });

    fireEvent.submit(screen.getByTestId("tool-policies-editor"));

    await waitFor(() => {
      const put = calls.find((c) => c.method === "PUT");
      expect(put).toBeTruthy();
      const parsed = JSON.parse(put!.body!) as { policies: typeof samplePolicies };
      const bx = parsed.policies.find((p) => p.pattern === "bitrix24.*");
      expect(bx?.args).toBe("keep_anonymized");
      expect(bx?.result).toBe("passthrough");
    });
  });

  it("shows error state on fetch failure", async () => {
    const errSpy = vi.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => ({ error: "boom" }),
      text: async () => "boom",
    }) as Response);
    (globalThis as unknown as { fetch: typeof fetch }).fetch = errSpy as unknown as typeof fetch;
    withQueryClient(<ToolPoliciesEditor />);
    await waitFor(() => expect(screen.getByTestId("tool-policies-error")).toBeInTheDocument());
  });
});
