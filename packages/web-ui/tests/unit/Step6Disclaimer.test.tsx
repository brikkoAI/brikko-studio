/**
 * Tests for Onboarding Step 6 — three-touch disclaimer.
 *
 * The acceptance criteria from the task brief are:
 *   - Finish button is disabled until ALL three checkboxes are independently
 *     checked.
 *   - Clicking Finish POSTs /api/onboarding/disclaimer/ack AND
 *     /api/onboarding/finalize, then calls onFinish().
 *   - If either backend call fails, error banner shown and onFinish NOT called.
 *
 * The exact РФ disclaimer wording from spec §5.9 must appear verbatim.
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
import { Step6Disclaimer } from "../../src/onboarding/Step6Disclaimer.js";

interface FetchCall {
  url: string;
  method: string;
}

function makeFetchSpy(opts?: { failAck?: boolean; failFinalize?: boolean }) {
  const calls: FetchCall[] = [];
  const spy = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === "string" ? input : input.toString();
      const method = init?.method ?? "GET";
      calls.push({ url, method });

      if (url.endsWith("/api/onboarding/disclaimer/ack")) {
        return {
          ok: opts?.failAck !== true,
          status: opts?.failAck === true ? 500 : 204,
          text: async () => (opts?.failAck === true ? "ack-fail" : ""),
          json: async () => ({}),
        } as Response;
      }
      if (url.endsWith("/api/onboarding/finalize")) {
        return {
          ok: opts?.failFinalize !== true,
          status: opts?.failFinalize === true ? 500 : 204,
          text: async () => (opts?.failFinalize === true ? "finalize-fail" : ""),
          json: async () => ({}),
        } as Response;
      }
      return {
        ok: false,
        status: 404,
        text: async () => "not-found",
        json: async () => ({}),
      } as Response;
    },
  );
  return { spy, calls };
}

describe("Step6Disclaimer", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(async () => {
    (globalThis as unknown as { fetch: typeof fetch }).fetch = originalFetch;
    // Restore default locale so module-level state doesn't leak between tests.
    const { setLocale } = await import("../../src/i18n/index.js");
    setLocale("en");
  });

  it("renders the verbatim spec §5.9 disclaimer wording", async () => {
    const { spy } = makeFetchSpy();
    (globalThis as unknown as { fetch: typeof fetch }).fetch =
      spy as unknown as typeof fetch;

    // Force the catalog to ru for this test — jsdom navigator.language defaults
    // to "en-US" so without this the test runs against the English catalog
    // which has different wording.
    const { setLocale } = await import("../../src/i18n/index.js");
    setLocale("ru");

    render(<Step6Disclaimer onFinish={() => {}} onBack={() => {}} />);

    expect(
      screen.getByText(
        /Я понимаю, что Brikko никогда не отправляет данные в LLM в открытом виде/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Я подтверждаю, что прочитал и принимаю Privacy Policy/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Я согласен с условиями использования/),
    ).toBeInTheDocument();
  });

  it("Finish stays disabled until all three checkboxes are checked", async () => {
    const user = userEvent.setup();
    const { spy } = makeFetchSpy();
    (globalThis as unknown as { fetch: typeof fetch }).fetch =
      spy as unknown as typeof fetch;

    render(<Step6Disclaimer onFinish={() => {}} onBack={() => {}} />);
    const finish = screen.getByTestId("step-6-finish");
    expect(finish).toBeDisabled();

    await user.click(screen.getByTestId("step-6-check1"));
    expect(finish).toBeDisabled();

    await user.click(screen.getByTestId("step-6-check2"));
    expect(finish).toBeDisabled();

    await user.click(screen.getByTestId("step-6-check3"));
    expect(finish).toBeEnabled();
  });

  it("Finish click calls ack + finalize endpoints then onFinish", async () => {
    const user = userEvent.setup();
    const { spy, calls } = makeFetchSpy();
    (globalThis as unknown as { fetch: typeof fetch }).fetch =
      spy as unknown as typeof fetch;

    const onFinish = vi.fn();
    render(<Step6Disclaimer onFinish={onFinish} onBack={() => {}} />);

    await user.click(screen.getByTestId("step-6-check1"));
    await user.click(screen.getByTestId("step-6-check2"));
    await user.click(screen.getByTestId("step-6-check3"));
    await user.click(screen.getByTestId("step-6-finish"));

    await waitFor(() => {
      expect(
        calls.find(
          (c) =>
            c.url.endsWith("/api/onboarding/disclaimer/ack") &&
            c.method === "POST",
        ),
      ).toBeTruthy();
      expect(
        calls.find(
          (c) =>
            c.url.endsWith("/api/onboarding/finalize") && c.method === "POST",
        ),
      ).toBeTruthy();
    });
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it("does NOT navigate when ack fails", async () => {
    const user = userEvent.setup();
    const { spy } = makeFetchSpy({ failAck: true });
    (globalThis as unknown as { fetch: typeof fetch }).fetch =
      spy as unknown as typeof fetch;

    const onFinish = vi.fn();
    render(<Step6Disclaimer onFinish={onFinish} onBack={() => {}} />);

    await user.click(screen.getByTestId("step-6-check1"));
    await user.click(screen.getByTestId("step-6-check2"));
    await user.click(screen.getByTestId("step-6-check3"));
    await user.click(screen.getByTestId("step-6-finish"));

    await waitFor(() =>
      expect(screen.getByTestId("step-6-error")).toBeInTheDocument(),
    );
    expect(onFinish).not.toHaveBeenCalled();
  });

  it("does NOT navigate when finalize fails", async () => {
    const user = userEvent.setup();
    const { spy } = makeFetchSpy({ failFinalize: true });
    (globalThis as unknown as { fetch: typeof fetch }).fetch =
      spy as unknown as typeof fetch;

    const onFinish = vi.fn();
    render(<Step6Disclaimer onFinish={onFinish} onBack={() => {}} />);

    await user.click(screen.getByTestId("step-6-check1"));
    await user.click(screen.getByTestId("step-6-check2"));
    await user.click(screen.getByTestId("step-6-check3"));
    await user.click(screen.getByTestId("step-6-finish"));

    await waitFor(() =>
      expect(screen.getByTestId("step-6-error")).toBeInTheDocument(),
    );
    expect(onFinish).not.toHaveBeenCalled();
  });
});
