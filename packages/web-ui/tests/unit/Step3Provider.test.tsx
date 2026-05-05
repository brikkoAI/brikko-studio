/**
 * Tests for Onboarding Step 3 — LLM provider choice.
 *   - Brikko mode is the default → CTA reads "Войти через Brikko".
 *   - BYO mode shows provider <select> + masked API key input.
 *   - BYO Continue is disabled until key is non-empty.
 *   - BYO Continue POSTs to /api/onboarding/llm-provider and calls onNext.
 *   - Brikko Continue calls /api/auth/start and redirects to authorize_url.
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
import { Step3Provider } from "../../src/onboarding/Step3Provider.js";

interface FetchCall {
  url: string;
  method: string;
  body: string | null;
}

function makeFetchSpy() {
  const calls: FetchCall[] = [];
  const spy = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === "string" ? input : input.toString();
      const method = init?.method ?? "GET";
      const body = init?.body ? String(init.body) : null;
      calls.push({ url, method, body });

      if (url.endsWith("/api/auth/start")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            authorize_url: "https://auth.brikko.ru/authorize?state=abc",
          }),
          text: async () => "",
        } as Response;
      }
      if (url.endsWith("/api/onboarding/llm-provider")) {
        return {
          ok: true,
          status: 204,
          json: async () => ({}),
          text: async () => "",
        } as Response;
      }
      return {
        ok: false,
        status: 404,
        json: async () => ({}),
        text: async () => "not-found",
      } as Response;
    },
  );
  return { spy, calls };
}

describe("Step3Provider", () => {
  let originalFetch: typeof globalThis.fetch;
  let originalLocation: Location;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    originalLocation = window.location;
    // Replace location with a mock so we can detect href assignments.
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: { ...originalLocation, href: originalLocation.href },
    });
  });

  afterEach(() => {
    (globalThis as unknown as { fetch: typeof fetch }).fetch = originalFetch;
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
  });

  it("defaults to Brikko Gateway mode and labels CTA accordingly", () => {
    const { spy } = makeFetchSpy();
    (globalThis as unknown as { fetch: typeof fetch }).fetch =
      spy as unknown as typeof fetch;

    render(<Step3Provider onNext={() => {}} onBack={() => {}} />);

    const brikkoCard = screen.getByTestId("step-3-mode-brikko");
    expect(brikkoCard).toHaveAttribute("aria-checked", "true");
    expect(screen.queryByTestId("step-3-byo-fields")).toBeNull();
    expect(screen.getByTestId("step-3-continue").textContent).toMatch(
      /Войти через Brikko|Sign in with Brikko/i,
    );
  });

  it("BYO Continue is disabled while key is empty, enables after typing", async () => {
    const user = userEvent.setup();
    const { spy } = makeFetchSpy();
    (globalThis as unknown as { fetch: typeof fetch }).fetch =
      spy as unknown as typeof fetch;

    render(<Step3Provider onNext={() => {}} onBack={() => {}} />);
    await user.click(screen.getByTestId("step-3-mode-byo"));

    expect(screen.getByTestId("step-3-byo-fields")).toBeInTheDocument();
    expect(screen.getByTestId("step-3-continue")).toBeDisabled();

    const keyInput = screen.getByTestId("step-3-byo-key") as HTMLInputElement;
    expect(keyInput.type).toBe("password"); // masked
    await user.type(keyInput, "sk-test-1234");

    expect(screen.getByTestId("step-3-continue")).toBeEnabled();
  });

  it("BYO Continue POSTs the chosen provider + key, then calls onNext", async () => {
    const user = userEvent.setup();
    const { spy, calls } = makeFetchSpy();
    (globalThis as unknown as { fetch: typeof fetch }).fetch =
      spy as unknown as typeof fetch;

    const onNext = vi.fn();
    render(<Step3Provider onNext={onNext} onBack={() => {}} />);

    await user.click(screen.getByTestId("step-3-mode-byo"));
    await user.selectOptions(screen.getByTestId("step-3-byo-provider"), "openai");
    await user.type(screen.getByTestId("step-3-byo-key"), "sk-openai");
    await user.click(screen.getByTestId("step-3-continue"));

    await waitFor(() => {
      const post = calls.find(
        (c) =>
          c.url.endsWith("/api/onboarding/llm-provider") && c.method === "POST",
      );
      expect(post).toBeTruthy();
      expect(JSON.parse(post!.body!)).toEqual({
        kind: "byo",
        provider: "openai",
        api_key: "sk-openai",
      });
    });
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("Brikko Continue starts OAuth and redirects to authorize_url", async () => {
    const user = userEvent.setup();
    const { spy, calls } = makeFetchSpy();
    (globalThis as unknown as { fetch: typeof fetch }).fetch =
      spy as unknown as typeof fetch;

    const onNext = vi.fn();
    render(<Step3Provider onNext={onNext} onBack={() => {}} />);
    await user.click(screen.getByTestId("step-3-continue"));

    await waitFor(() => {
      const post = calls.find(
        (c) => c.url.endsWith("/api/auth/start") && c.method === "POST",
      );
      expect(post).toBeTruthy();
    });

    expect(window.location.href).toBe(
      "https://auth.brikko.ru/authorize?state=abc",
    );
    // onNext is NOT called — we leave the page entirely.
    expect(onNext).not.toHaveBeenCalled();
  });
});
