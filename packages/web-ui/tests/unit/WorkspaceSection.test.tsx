/**
 * Tests for Settings → WorkspaceSection.
 *   - Loading + error states
 *   - Renders name, created_at, fingerprint
 *   - Backup button triggers POST and download
 */
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorkspaceSection } from "../../src/settings/WorkspaceSection.js";
import { withQueryClient } from "./test-utils.js";

const sampleWorkspace = {
  name: "Acme Corp",
  key_fingerprint: "sha256:abc123def456",
  created_at: "2026-05-01T00:00:00Z",
};

interface FetchCall {
  url: string;
  method: string;
}

function makeFetchSpy(workspace: typeof sampleWorkspace | null) {
  const calls: FetchCall[] = [];
  const spy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input.toString();
    const method = init?.method ?? "GET";
    calls.push({ url, method });
    if (method === "POST") {
      return {
        ok: true,
        status: 200,
        blob: async () => new Blob(["backup-bytes"], { type: "application/octet-stream" }),
        text: async () => "",
        json: async () => ({}),
      } as unknown as Response;
    }
    if (!workspace) {
      return {
        ok: false,
        status: 500,
        json: async () => ({ error: "no" }),
        text: async () => "no",
      } as Response;
    }
    return {
      ok: true,
      status: 200,
      json: async () => workspace,
      text: async () => JSON.stringify(workspace),
    } as Response;
  });
  return { spy, calls };
}

describe("WorkspaceSection", () => {
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

  it("shows loading state initially", () => {
    const { spy } = makeFetchSpy(sampleWorkspace);
    (globalThis as unknown as { fetch: typeof fetch }).fetch = spy as unknown as typeof fetch;
    withQueryClient(<WorkspaceSection />);
    expect(screen.getByTestId("workspace-loading")).toBeInTheDocument();
  });

  it("renders workspace info when loaded", async () => {
    const { spy } = makeFetchSpy(sampleWorkspace);
    (globalThis as unknown as { fetch: typeof fetch }).fetch = spy as unknown as typeof fetch;
    withQueryClient(<WorkspaceSection />);
    await waitFor(() => expect(screen.getByTestId("workspace-name")).toBeInTheDocument());
    expect(screen.getByTestId("workspace-name").textContent).toBe("Acme Corp");
    expect(screen.getByTestId("workspace-fingerprint").textContent).toBe("sha256:abc123def456");
    expect(screen.getByTestId("workspace-created").textContent).toBe("2026-05-01T00:00:00Z");
  });

  it("triggers backup POST when button clicked", async () => {
    const user = userEvent.setup();
    const { spy, calls } = makeFetchSpy(sampleWorkspace);
    (globalThis as unknown as { fetch: typeof fetch }).fetch = spy as unknown as typeof fetch;
    withQueryClient(<WorkspaceSection />);
    await waitFor(() => screen.getByTestId("workspace-backup"));

    const clickSpy = vi.fn();
    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = origCreateElement(tag);
      if (tag === "a") {
        (el as HTMLAnchorElement).click = clickSpy;
      }
      return el;
    });

    await user.click(screen.getByTestId("workspace-backup"));

    await waitFor(() => {
      const post = calls.find((c) => c.method === "POST" && c.url.includes("/api/settings/workspace/backup"));
      expect(post).toBeTruthy();
    });
    expect(clickSpy).toHaveBeenCalled();
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });

  it("shows error state when fetch fails", async () => {
    const { spy } = makeFetchSpy(null);
    (globalThis as unknown as { fetch: typeof fetch }).fetch = spy as unknown as typeof fetch;
    withQueryClient(<WorkspaceSection />);
    await waitFor(() => expect(screen.getByTestId("workspace-error")).toBeInTheDocument());
  });
});
