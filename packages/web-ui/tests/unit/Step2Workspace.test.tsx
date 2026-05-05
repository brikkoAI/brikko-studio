/**
 * Tests for Onboarding Step 2 — workspace creation + mandatory backup download.
 *   - Validates name (alphanumeric + _ + -, 1..64).
 *   - Calls POST /api/onboarding/create-workspace, shows fingerprint banner.
 *   - Forces user to tick "I saved the backup" before Next is enabled.
 *   - Download click triggers POST workspace/backup + a.click().
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
import { Step2Workspace } from "../../src/onboarding/Step2Workspace.js";

interface FetchCall {
  url: string;
  method: string;
  body: string | null;
}

function makeFetchSpy(opts?: { failCreate?: boolean }) {
  const calls: FetchCall[] = [];
  const spy = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === "string" ? input : input.toString();
      const method = init?.method ?? "GET";
      const body = init?.body ? String(init.body) : null;
      calls.push({ url, method, body });

      if (url.endsWith("/api/onboarding/create-workspace")) {
        if (opts?.failCreate === true) {
          return {
            ok: false,
            status: 500,
            text: async () => "boom",
            json: async () => ({ error: "boom" }),
          } as Response;
        }
        return {
          ok: true,
          status: 200,
          text: async () => "",
          json: async () => ({
            id: "ws_01HXYZ",
            name: "personal",
            key_fingerprint: "sha256:cafe1234",
          }),
        } as Response;
      }
      if (url.endsWith("/api/onboarding/workspace/backup")) {
        return {
          ok: true,
          status: 200,
          blob: async () =>
            new Blob(["enc-backup-bytes"], { type: "application/octet-stream" }),
          text: async () => "",
        } as unknown as Response;
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

describe("Step2Workspace", () => {
  let originalFetch: typeof globalThis.fetch;
  let originalCreate: typeof URL.createObjectURL;
  let originalRevoke: typeof URL.revokeObjectURL;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    originalCreate = URL.createObjectURL;
    originalRevoke = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn(() => "blob:mock-url");
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    (globalThis as unknown as { fetch: typeof fetch }).fetch = originalFetch;
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
  });

  it("disables Create when name has spaces (invalid)", async () => {
    const user = userEvent.setup();
    const { spy } = makeFetchSpy();
    (globalThis as unknown as { fetch: typeof fetch }).fetch =
      spy as unknown as typeof fetch;

    render(<Step2Workspace onNext={() => {}} onBack={() => {}} />);
    const input = screen.getByTestId("step-2-name-input") as HTMLInputElement;
    await user.clear(input);
    await user.type(input, "bad name with spaces");

    expect(screen.getByTestId("step-2-create")).toBeDisabled();
    expect(screen.getByTestId("step-2-name-error")).toBeInTheDocument();
  });

  it("creates workspace, shows fingerprint, and gates Next on backup confirmation", async () => {
    const user = userEvent.setup();
    const { spy, calls } = makeFetchSpy();
    (globalThis as unknown as { fetch: typeof fetch }).fetch =
      spy as unknown as typeof fetch;

    const onNext = vi.fn();
    render(<Step2Workspace onNext={onNext} onBack={() => {}} />);

    // Default name "personal" is valid.
    await user.click(screen.getByTestId("step-2-create"));

    await waitFor(() =>
      expect(screen.getByTestId("step-2-created-banner")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("step-2-fingerprint").textContent).toBe(
      "sha256:cafe1234",
    );

    // POST went out with the right body
    const post = calls.find(
      (c) =>
        c.url.endsWith("/api/onboarding/create-workspace") &&
        c.method === "POST",
    );
    expect(post).toBeTruthy();
    expect(JSON.parse(post!.body!)).toEqual({ name: "personal" });

    // Next is disabled until checkbox is ticked, even if the user clicked Download.
    const nextBtn = screen.getByTestId("step-2-next");
    expect(nextBtn).toBeDisabled();

    await user.click(screen.getByTestId("step-2-backup-confirm"));
    expect(nextBtn).toBeEnabled();

    await user.click(nextBtn);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("Download click triggers blob download (POST + a.click())", async () => {
    const user = userEvent.setup();
    const { spy, calls } = makeFetchSpy();
    (globalThis as unknown as { fetch: typeof fetch }).fetch =
      spy as unknown as typeof fetch;

    render(<Step2Workspace onNext={() => {}} onBack={() => {}} />);

    await user.click(screen.getByTestId("step-2-create"));
    await waitFor(() =>
      expect(screen.getByTestId("step-2-backup")).toBeInTheDocument(),
    );

    const clickSpy = vi.fn();
    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = origCreateElement(tag);
      if (tag === "a") {
        (el as HTMLAnchorElement).click = clickSpy;
      }
      return el;
    });

    await user.click(screen.getByTestId("step-2-backup"));

    await waitFor(() => {
      const post = calls.find(
        (c) =>
          c.url.endsWith("/api/onboarding/workspace/backup") &&
          c.method === "POST",
      );
      expect(post).toBeTruthy();
    });
    expect(clickSpy).toHaveBeenCalled();
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");

    // Critically: clicking download does NOT auto-set the confirm checkbox.
    expect(
      (screen.getByTestId("step-2-backup-confirm") as HTMLInputElement).checked,
    ).toBe(false);
    expect(screen.getByTestId("step-2-next")).toBeDisabled();
  });

  it("shows an error banner when create-workspace fails", async () => {
    const user = userEvent.setup();
    const { spy } = makeFetchSpy({ failCreate: true });
    (globalThis as unknown as { fetch: typeof fetch }).fetch =
      spy as unknown as typeof fetch;

    render(<Step2Workspace onNext={() => {}} onBack={() => {}} />);
    await user.click(screen.getByTestId("step-2-create"));

    await waitFor(() =>
      expect(screen.getByTestId("step-2-error")).toBeInTheDocument(),
    );
    // Stayed on form — no banner, no checkbox.
    expect(screen.queryByTestId("step-2-created-banner")).toBeNull();
  });
});
