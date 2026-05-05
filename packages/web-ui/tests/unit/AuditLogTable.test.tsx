/**
 * Tests for AuditLogTable — verify rows render, pagination buttons enable/disable,
 * empty state, and category filter triggers a refetch with the correct param.
 */
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { AuditLogTable } from "../../src/privacy/AuditLogTable.js";
import { withQueryClient } from "./test-utils.js";

const sampleEvent = {
  timestamp: "2026-05-05T10:00:00Z",
  event_type: "anonymize",
  category: "PERSON",
  placeholder: "<NAME_1>",
  request_id: "req_1",
  policy_profile: "balanced",
};

function makeFetchSpy(responses: unknown[]) {
  let i = 0;
  return vi.fn(async () => {
    const body = responses[i] ?? responses[responses.length - 1];
    i += 1;
    return {
      ok: true,
      status: 200,
      json: async () => body,
      text: async () => JSON.stringify(body),
    } as Response;
  });
}

describe("AuditLogTable", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    (globalThis as unknown as { fetch: typeof fetch }).fetch = originalFetch;
  });

  it("shows empty state when no events", async () => {
    const spy = makeFetchSpy([{ events: [], total: 0, next_offset: null }]);
    (globalThis as unknown as { fetch: typeof fetch }).fetch = spy as unknown as typeof fetch;
    withQueryClient(<AuditLogTable />);
    await waitFor(() => expect(screen.getByTestId("audit-empty")).toBeInTheDocument());
  });

  it("renders rows when events present", async () => {
    const spy = makeFetchSpy([{ events: [sampleEvent, { ...sampleEvent, request_id: "req_2" }], total: 2, next_offset: null }]);
    (globalThis as unknown as { fetch: typeof fetch }).fetch = spy as unknown as typeof fetch;
    withQueryClient(<AuditLogTable />);
    await waitFor(() => expect(screen.getAllByText("<NAME_1>")).toHaveLength(2));
    expect(screen.getAllByText("anonymize")).toHaveLength(2);
  });

  it("enables Next when next_offset is present, disables otherwise", async () => {
    const spy = makeFetchSpy([{ events: [sampleEvent], total: 100, next_offset: 50 }]);
    (globalThis as unknown as { fetch: typeof fetch }).fetch = spy as unknown as typeof fetch;
    withQueryClient(<AuditLogTable />);
    await waitFor(() => expect(screen.getByTestId("audit-next")).toBeInTheDocument());
    expect(screen.getByTestId("audit-next")).not.toBeDisabled();
    expect(screen.getByTestId("audit-prev")).toBeDisabled();
  });

  it("changes category filter triggers a refetch with category= param", async () => {
    const spy = makeFetchSpy([
      { events: [sampleEvent], total: 1, next_offset: null },
      { events: [], total: 0, next_offset: null },
    ]);
    (globalThis as unknown as { fetch: typeof fetch }).fetch = spy as unknown as typeof fetch;
    withQueryClient(<AuditLogTable />);
    await waitFor(() => expect(screen.getByText("anonymize")).toBeInTheDocument());

    const select = screen.getByTestId("audit-filter-category");
    fireEvent.change(select, { target: { value: "INN" } });

    await waitFor(() => {
      const calls = spy.mock.calls;
      const lastUrl = String(calls[calls.length - 1]?.[0] ?? "");
      expect(lastUrl).toMatch(/category=INN/);
    });
  });

  it("shows error state on fetch failure", async () => {
    const spy = vi.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => ({ error: "boom" }),
      text: async () => "boom",
    }) as Response);
    (globalThis as unknown as { fetch: typeof fetch }).fetch = spy as unknown as typeof fetch;
    withQueryClient(<AuditLogTable />);
    await waitFor(() => expect(screen.getByTestId("audit-error")).toBeInTheDocument());
  });
});
