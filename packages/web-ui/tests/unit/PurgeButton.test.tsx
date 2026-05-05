/**
 * Tests for PurgeButton — multi-step destructive confirm:
 *   1. Modal opens on button click
 *   2. Primary disabled until checkbox AND phrase match
 *   3. POST /api/privacy/purge fires only when both gates pass
 *   4. Success state shows deleted count
 */
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PurgeButton } from "../../src/privacy/PurgeButton.js";
import { withQueryClient } from "./test-utils.js";

interface FetchCall {
  url: string;
  method: string;
  body: string | null;
}

function makePurgeFetchSpy(deleted: number) {
  const calls: FetchCall[] = [];
  const spy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input.toString();
    calls.push({
      url,
      method: init?.method ?? "GET",
      body: init?.body ? String(init.body) : null,
    });
    return {
      ok: true,
      status: 200,
      json: async () => ({ deleted_mappings: deleted }),
      text: async () => JSON.stringify({ deleted_mappings: deleted }),
    } as Response;
  });
  return { spy, calls };
}

describe("PurgeButton", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    (globalThis as unknown as { fetch: typeof fetch }).fetch = originalFetch;
  });

  it("renders the open button", () => {
    withQueryClient(<PurgeButton />);
    expect(screen.getByTestId("purge-open")).toBeInTheDocument();
  });

  it("opens the confirm modal when the open button is clicked", async () => {
    const user = userEvent.setup();
    withQueryClient(<PurgeButton />);
    await user.click(screen.getByTestId("purge-open"));
    expect(screen.getByTestId("purge-modal")).toBeInTheDocument();
    expect(screen.getByTestId("purge-ack")).toBeInTheDocument();
    expect(screen.getByTestId("purge-phrase")).toBeInTheDocument();
  });

  it("primary is disabled when modal opens with no inputs", async () => {
    const user = userEvent.setup();
    withQueryClient(<PurgeButton />);
    await user.click(screen.getByTestId("purge-open"));
    expect(screen.getByTestId("confirm-primary")).toBeDisabled();
  });

  it("primary stays disabled when only checkbox is checked", async () => {
    const user = userEvent.setup();
    withQueryClient(<PurgeButton />);
    await user.click(screen.getByTestId("purge-open"));
    await user.click(screen.getByTestId("purge-ack"));
    expect(screen.getByTestId("confirm-primary")).toBeDisabled();
  });

  it("primary stays disabled when only phrase is typed", async () => {
    const user = userEvent.setup();
    withQueryClient(<PurgeButton />);
    await user.click(screen.getByTestId("purge-open"));
    fireEvent.change(screen.getByTestId("purge-phrase"), { target: { value: "УДАЛИТЬ ВСЕ" } });
    expect(screen.getByTestId("confirm-primary")).toBeDisabled();
  });

  it("primary stays disabled when phrase typo (case mismatch)", async () => {
    const user = userEvent.setup();
    withQueryClient(<PurgeButton />);
    await user.click(screen.getByTestId("purge-open"));
    await user.click(screen.getByTestId("purge-ack"));
    fireEvent.change(screen.getByTestId("purge-phrase"), { target: { value: "удалить все" } });
    expect(screen.getByTestId("confirm-primary")).toBeDisabled();
  });

  it("primary enables when both checkbox AND exact phrase are set", async () => {
    const user = userEvent.setup();
    withQueryClient(<PurgeButton />);
    await user.click(screen.getByTestId("purge-open"));
    await user.click(screen.getByTestId("purge-ack"));
    fireEvent.change(screen.getByTestId("purge-phrase"), { target: { value: "УДАЛИТЬ ВСЕ" } });
    expect(screen.getByTestId("confirm-primary")).toBeEnabled();
  });

  it("calls POST /api/privacy/purge when confirmed and shows success count", async () => {
    const user = userEvent.setup();
    const { spy, calls } = makePurgeFetchSpy(42);
    (globalThis as unknown as { fetch: typeof fetch }).fetch = spy as unknown as typeof fetch;
    withQueryClient(<PurgeButton />);

    await user.click(screen.getByTestId("purge-open"));
    await user.click(screen.getByTestId("purge-ack"));
    fireEvent.change(screen.getByTestId("purge-phrase"), { target: { value: "УДАЛИТЬ ВСЕ" } });
    await user.click(screen.getByTestId("confirm-primary"));

    await waitFor(() => {
      const post = calls.find((c) => c.method === "POST" && c.url.includes("/api/privacy/purge"));
      expect(post).toBeTruthy();
    });

    await waitFor(() => {
      const success = screen.getByTestId("purge-success");
      expect(success.textContent).toContain("42");
    });
  });

  it("resets state when modal is dismissed", async () => {
    const user = userEvent.setup();
    withQueryClient(<PurgeButton />);
    await user.click(screen.getByTestId("purge-open"));
    await user.click(screen.getByTestId("purge-ack"));
    fireEvent.change(screen.getByTestId("purge-phrase"), { target: { value: "УДАЛИТЬ ВСЕ" } });

    await user.click(screen.getByTestId("confirm-cancel"));

    await user.click(screen.getByTestId("purge-open"));
    expect((screen.getByTestId("purge-ack") as HTMLInputElement).checked).toBe(false);
    expect((screen.getByTestId("purge-phrase") as HTMLInputElement).value).toBe("");
  });
});
