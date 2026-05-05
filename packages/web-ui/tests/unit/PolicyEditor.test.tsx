/**
 * Tests for PolicyEditor — verify default profile selection, profile switching,
 * sensitivity overrides, and that Save dispatches PUT /api/privacy/policy.
 */
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PolicyEditor } from "../../src/privacy/PolicyEditor.js";
import { withQueryClient } from "./test-utils.js";

interface FetchCall {
  url: string;
  method: string;
  body: string | null;
}

function makeFetchSpy(initialPolicy: { profile: string; category_overrides: Record<string, string> }) {
  const calls: FetchCall[] = [];
  let policy = initialPolicy;
  const spy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input.toString();
    const method = init?.method ?? "GET";
    const body = init?.body ? String(init.body) : null;
    calls.push({ url, method, body });
    if (method === "PUT" && body) {
      policy = JSON.parse(body) as typeof policy;
      return { ok: true, status: 200, json: async () => ({ ok: true }), text: async () => "" } as Response;
    }
    return {
      ok: true,
      status: 200,
      json: async () => policy,
      text: async () => JSON.stringify(policy),
    } as Response;
  });
  return { spy, calls };
}

describe("PolicyEditor", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    (globalThis as unknown as { fetch: typeof fetch }).fetch = originalFetch;
  });

  it("shows loading state initially", () => {
    const { spy } = makeFetchSpy({ profile: "balanced", category_overrides: {} });
    (globalThis as unknown as { fetch: typeof fetch }).fetch = spy as unknown as typeof fetch;
    withQueryClient(<PolicyEditor />);
    expect(screen.getByTestId("policy-loading")).toBeInTheDocument();
  });

  it("renders three profile radios with balanced selected when policy.profile=balanced", async () => {
    const { spy } = makeFetchSpy({ profile: "balanced", category_overrides: {} });
    (globalThis as unknown as { fetch: typeof fetch }).fetch = spy as unknown as typeof fetch;
    withQueryClient(<PolicyEditor />);
    await waitFor(() => expect(screen.getByTestId("policy-editor")).toBeInTheDocument());
    const radios = screen.getAllByRole("radio") as HTMLInputElement[];
    expect(radios).toHaveLength(3);
    const balanced = radios.find((r) => r.value === "balanced");
    const strict = radios.find((r) => r.value === "strict");
    const permissive = radios.find((r) => r.value === "permissive");
    expect(balanced?.checked).toBe(true);
    expect(strict?.checked).toBe(false);
    expect(permissive?.checked).toBe(false);
  });

  it("PUTs the new profile when user switches and clicks Save", async () => {
    const user = userEvent.setup();
    const { spy, calls } = makeFetchSpy({ profile: "balanced", category_overrides: {} });
    (globalThis as unknown as { fetch: typeof fetch }).fetch = spy as unknown as typeof fetch;
    withQueryClient(<PolicyEditor />);
    await waitFor(() => expect(screen.getByTestId("policy-editor")).toBeInTheDocument());

    const strict = screen.getAllByRole("radio").find(
      (r) => (r as HTMLInputElement).value === "strict"
    ) as HTMLInputElement;
    await user.click(strict);

    await user.click(screen.getByTestId("policy-save"));

    await waitFor(() => {
      const put = calls.find((c) => c.method === "PUT");
      expect(put).toBeTruthy();
      const parsed = JSON.parse(put!.body!) as { profile: string };
      expect(parsed.profile).toBe("strict");
    });
  });

  it("adds a category override and removes it when user picks default", async () => {
    const { spy, calls } = makeFetchSpy({ profile: "balanced", category_overrides: {} });
    (globalThis as unknown as { fetch: typeof fetch }).fetch = spy as unknown as typeof fetch;
    withQueryClient(<PolicyEditor />);
    await waitFor(() => expect(screen.getByTestId("policy-editor")).toBeInTheDocument());

    const personSel = screen.getByTestId("override-PERSON") as HTMLSelectElement;
    fireEvent.change(personSel, { target: { value: "critical" } });

    fireEvent.submit(screen.getByTestId("policy-editor"));

    await waitFor(() => {
      const put = calls.find((c) => c.method === "PUT");
      expect(put).toBeTruthy();
      const parsed = JSON.parse(put!.body!) as {
        category_overrides: Record<string, string>;
      };
      expect(parsed.category_overrides.PERSON).toBe("critical");
    });

    // Now reset to default → key should be deleted
    fireEvent.change(personSel, { target: { value: "default" } });
    fireEvent.submit(screen.getByTestId("policy-editor"));

    await waitFor(() => {
      const puts = calls.filter((c) => c.method === "PUT");
      expect(puts.length).toBeGreaterThanOrEqual(2);
      const lastPut = puts[puts.length - 1]!;
      const parsed = JSON.parse(lastPut.body!) as {
        category_overrides: Record<string, string>;
      };
      expect("PERSON" in parsed.category_overrides).toBe(false);
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
    withQueryClient(<PolicyEditor />);
    await waitFor(() => expect(screen.getByTestId("policy-error")).toBeInTheDocument());
  });
});
