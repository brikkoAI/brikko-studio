/**
 * Tests for Onboarding Step 4 — privacy profile selection.
 *   - Default = balanced (matches PolicyEditor default).
 *   - Continue PUTs to /api/privacy/policy with the chosen profile + empty
 *     overrides + then calls onNext().
 *   - On API failure, an error banner appears and onNext is NOT called.
 */
import {
  describe,
  expect,
  it,
  beforeEach,
  afterEach,
  vi,
} from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Step4Profile } from "../../src/onboarding/Step4Profile.js";

interface FetchCall {
  url: string;
  method: string;
  body: string | null;
}

function makeFetchSpy(opts?: { fail?: boolean }) {
  const calls: FetchCall[] = [];
  const spy = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === "string" ? input : input.toString();
      const method = init?.method ?? "GET";
      const body = init?.body ? String(init.body) : null;
      calls.push({ url, method, body });
      if (opts?.fail === true) {
        return {
          ok: false,
          status: 500,
          text: async () => "boom",
          json: async () => ({}),
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        text: async () => "",
        json: async () => ({}),
      } as Response;
    },
  );
  return { spy, calls };
}

describe("Step4Profile", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    (globalThis as unknown as { fetch: typeof fetch }).fetch = originalFetch;
  });

  it("defaults to balanced profile selected", () => {
    const { spy } = makeFetchSpy();
    (globalThis as unknown as { fetch: typeof fetch }).fetch =
      spy as unknown as typeof fetch;

    render(<Step4Profile onNext={() => {}} onBack={() => {}} />);
    const radios = screen.getAllByRole("radio") as HTMLInputElement[];
    expect(radios).toHaveLength(3);
    expect(radios.find((r) => r.value === "balanced")?.checked).toBe(true);
    expect(radios.find((r) => r.value === "strict")?.checked).toBe(false);
    expect(radios.find((r) => r.value === "permissive")?.checked).toBe(false);
  });

  it("PUTs the chosen profile and calls onNext on success", async () => {
    const user = userEvent.setup();
    const { spy, calls } = makeFetchSpy();
    (globalThis as unknown as { fetch: typeof fetch }).fetch =
      spy as unknown as typeof fetch;

    const onNext = vi.fn();
    render(<Step4Profile onNext={onNext} onBack={() => {}} />);

    // Switch to strict
    const strictRadio = (screen.getAllByRole("radio") as HTMLInputElement[]).find(
      (r) => r.value === "strict",
    )!;
    await user.click(strictRadio);
    await user.click(screen.getByTestId("step-4-continue"));

    await waitFor(() => {
      const put = calls.find(
        (c) => c.url.endsWith("/api/privacy/policy") && c.method === "PUT",
      );
      expect(put).toBeTruthy();
      expect(JSON.parse(put!.body!)).toEqual({
        profile: "strict",
        category_overrides: {},
      });
    });
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("shows error and skips onNext when policy save fails", async () => {
    const user = userEvent.setup();
    const { spy } = makeFetchSpy({ fail: true });
    (globalThis as unknown as { fetch: typeof fetch }).fetch =
      spy as unknown as typeof fetch;

    const onNext = vi.fn();
    render(<Step4Profile onNext={onNext} onBack={() => {}} />);
    await user.click(screen.getByTestId("step-4-continue"));

    await waitFor(() =>
      expect(screen.getByTestId("step-4-error")).toBeInTheDocument(),
    );
    expect(onNext).not.toHaveBeenCalled();
  });
});
