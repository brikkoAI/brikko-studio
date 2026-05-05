/**
 * Tests for Settings → McpCredentialsSection.
 *   - Bitrix24: pre-fills portal_url, token never returned, save POSTs creds,
 *     test button only enables when has_token=true, label changes between
 *     "Save" and "Rotate token".
 *   - 1С: same shape with odata_url + username pre-filled.
 */
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { McpCredentialsSection } from "../../src/settings/McpCredentialsSection.js";
import { setLocale } from "../../src/i18n/index.js";
import { withQueryClient } from "./test-utils.js";

beforeEach(() => {
  // Force ru locale so the assertions on Cyrillic strings stay deterministic
  // regardless of navigator.language in the jsdom env.
  setLocale("ru");
});

interface FetchCall {
  url: string;
  method: string;
  body: string | null;
}

interface ServerState {
  bitrix: { portal_url: string | null; has_token: boolean };
  oneC: { odata_url: string | null; username: string | null; has_password: boolean };
  bitrixTest?: { ok: boolean; error?: string };
  oneCTest?: { ok: boolean; error?: string };
}

function makeServer(initial: ServerState) {
  const calls: FetchCall[] = [];
  const state = { ...initial };
  const spy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input.toString();
    const method = init?.method ?? "GET";
    const body = init?.body ? String(init.body) : null;
    calls.push({ url, method, body });

    const reply = (data: unknown, ok = true, status = 200): Response =>
      ({
        ok,
        status,
        json: async () => data,
        text: async () => JSON.stringify(data),
      }) as Response;

    if (url.endsWith("/api/settings/mcp/bitrix24") && method === "GET") {
      return reply(state.bitrix);
    }
    if (url.endsWith("/api/settings/mcp/bitrix24") && method === "POST") {
      const parsed = JSON.parse(body!) as { portal_url: string; webhook_token: string };
      state.bitrix = { portal_url: parsed.portal_url, has_token: true };
      return reply({ ok: true });
    }
    if (url.endsWith("/api/settings/mcp/bitrix24/test") && method === "POST") {
      return reply(state.bitrixTest ?? { ok: true });
    }
    if (url.endsWith("/api/settings/mcp/1c") && method === "GET") {
      return reply(state.oneC);
    }
    if (url.endsWith("/api/settings/mcp/1c") && method === "POST") {
      const parsed = JSON.parse(body!) as { odata_url: string; username: string; password: string };
      state.oneC = {
        odata_url: parsed.odata_url,
        username: parsed.username,
        has_password: true,
      };
      return reply({ ok: true });
    }
    if (url.endsWith("/api/settings/mcp/1c/test") && method === "POST") {
      return reply(state.oneCTest ?? { ok: true });
    }
    return reply({ error: "unknown" }, false, 404);
  });
  return { spy, calls };
}

describe("McpCredentialsSection — Bitrix24", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    (globalThis as unknown as { fetch: typeof fetch }).fetch = originalFetch;
  });

  it("pre-fills portal_url and shows 'Save' label when no token saved", async () => {
    const { spy } = makeServer({
      bitrix: { portal_url: "https://acme.bitrix24.ru", has_token: false },
      oneC: { odata_url: null, username: null, has_password: false },
    });
    (globalThis as unknown as { fetch: typeof fetch }).fetch = spy as unknown as typeof fetch;
    withQueryClient(<McpCredentialsSection />);
    await waitFor(() => expect(
      (screen.getByTestId("bitrix-portal") as HTMLInputElement).value
    ).toBe("https://acme.bitrix24.ru"));
    expect(screen.getByTestId("bitrix-save").textContent).toMatch(/Сохранить/);
    expect(screen.queryByTestId("bitrix-token-saved")).toBeNull();
    expect(screen.getByTestId("bitrix-test")).toBeDisabled();
  });

  it("renders 'Rotate' label and 'saved' badge when has_token=true", async () => {
    const { spy } = makeServer({
      bitrix: { portal_url: "https://acme.bitrix24.ru", has_token: true },
      oneC: { odata_url: null, username: null, has_password: false },
    });
    (globalThis as unknown as { fetch: typeof fetch }).fetch = spy as unknown as typeof fetch;
    withQueryClient(<McpCredentialsSection />);
    await waitFor(() => expect(screen.getByTestId("bitrix-token-saved")).toBeInTheDocument());
    expect(screen.getByTestId("bitrix-save").textContent).toMatch(/Заменить/);
    expect(screen.getByTestId("bitrix-test")).toBeEnabled();
  });

  it("token input has empty value even when has_token=true (never echoes secret)", async () => {
    const { spy } = makeServer({
      bitrix: { portal_url: "https://acme.bitrix24.ru", has_token: true },
      oneC: { odata_url: null, username: null, has_password: false },
    });
    (globalThis as unknown as { fetch: typeof fetch }).fetch = spy as unknown as typeof fetch;
    withQueryClient(<McpCredentialsSection />);
    await waitFor(() => screen.getByTestId("bitrix-token-saved"));
    expect((screen.getByTestId("bitrix-token") as HTMLInputElement).value).toBe("");
    expect((screen.getByTestId("bitrix-token") as HTMLInputElement).type).toBe("password");
  });

  it("POSTs creds when Save clicked and clears the token field on success", async () => {
    const user = userEvent.setup();
    const { spy, calls } = makeServer({
      bitrix: { portal_url: "https://acme.bitrix24.ru", has_token: false },
      oneC: { odata_url: null, username: null, has_password: false },
    });
    (globalThis as unknown as { fetch: typeof fetch }).fetch = spy as unknown as typeof fetch;
    withQueryClient(<McpCredentialsSection />);
    await waitFor(() => screen.getByTestId("bitrix-token"));

    fireEvent.change(screen.getByTestId("bitrix-token"), { target: { value: "1/secret-tok" } });
    await user.click(screen.getByTestId("bitrix-save"));

    await waitFor(() => {
      const post = calls.find((c) => c.method === "POST" && c.url.endsWith("/api/settings/mcp/bitrix24"));
      expect(post).toBeTruthy();
      const parsed = JSON.parse(post!.body!) as { portal_url: string; webhook_token: string };
      expect(parsed.portal_url).toBe("https://acme.bitrix24.ru");
      expect(parsed.webhook_token).toBe("1/secret-tok");
    });
    await waitFor(() => {
      expect((screen.getByTestId("bitrix-token") as HTMLInputElement).value).toBe("");
    });
  });

  it("shows ✓ OK after successful test", async () => {
    const user = userEvent.setup();
    const { spy } = makeServer({
      bitrix: { portal_url: "https://acme.bitrix24.ru", has_token: true },
      oneC: { odata_url: null, username: null, has_password: false },
      bitrixTest: { ok: true },
    });
    (globalThis as unknown as { fetch: typeof fetch }).fetch = spy as unknown as typeof fetch;
    withQueryClient(<McpCredentialsSection />);
    await waitFor(() => expect(screen.getByTestId("bitrix-test")).toBeEnabled());
    await user.click(screen.getByTestId("bitrix-test"));
    await waitFor(() => expect(screen.getByTestId("bitrix-test-ok")).toBeInTheDocument());
  });

  it("shows ✗ error when test fails", async () => {
    const user = userEvent.setup();
    const { spy } = makeServer({
      bitrix: { portal_url: "https://acme.bitrix24.ru", has_token: true },
      oneC: { odata_url: null, username: null, has_password: false },
      bitrixTest: { ok: false, error: "401 unauthorized" },
    });
    (globalThis as unknown as { fetch: typeof fetch }).fetch = spy as unknown as typeof fetch;
    withQueryClient(<McpCredentialsSection />);
    await waitFor(() => expect(screen.getByTestId("bitrix-test")).toBeEnabled());
    await user.click(screen.getByTestId("bitrix-test"));
    await waitFor(() => expect(screen.getByTestId("bitrix-test-err")).toBeInTheDocument());
    expect(screen.getByTestId("bitrix-test-err").textContent).toContain("401");
  });
});

describe("McpCredentialsSection — 1С", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    (globalThis as unknown as { fetch: typeof fetch }).fetch = originalFetch;
  });

  it("pre-fills odata_url and username, password input always empty", async () => {
    const { spy } = makeServer({
      bitrix: { portal_url: null, has_token: false },
      oneC: {
        odata_url: "https://1c.example.com/odata/standard.odata",
        username: "admin",
        has_password: true,
      },
    });
    (globalThis as unknown as { fetch: typeof fetch }).fetch = spy as unknown as typeof fetch;
    withQueryClient(<McpCredentialsSection />);
    await waitFor(() =>
      expect((screen.getByTestId("1c-url") as HTMLInputElement).value).toBe(
        "https://1c.example.com/odata/standard.odata"
      )
    );
    expect((screen.getByTestId("1c-user") as HTMLInputElement).value).toBe("admin");
    expect((screen.getByTestId("1c-pwd") as HTMLInputElement).value).toBe("");
    expect(screen.getByTestId("1c-pwd-saved")).toBeInTheDocument();
    expect(screen.getByTestId("1c-save").textContent).toMatch(/Заменить/);
  });

  it("POSTs creds on Save and clears password on success", async () => {
    const user = userEvent.setup();
    const { spy, calls } = makeServer({
      bitrix: { portal_url: null, has_token: false },
      oneC: { odata_url: null, username: null, has_password: false },
    });
    (globalThis as unknown as { fetch: typeof fetch }).fetch = spy as unknown as typeof fetch;
    withQueryClient(<McpCredentialsSection />);
    await waitFor(() => screen.getByTestId("1c-url"));

    fireEvent.change(screen.getByTestId("1c-url"), {
      target: { value: "https://1c.example.com/odata/standard.odata" },
    });
    fireEvent.change(screen.getByTestId("1c-user"), { target: { value: "admin" } });
    fireEvent.change(screen.getByTestId("1c-pwd"), { target: { value: "p4ssw0rd" } });
    await user.click(screen.getByTestId("1c-save"));

    await waitFor(() => {
      const post = calls.find((c) => c.method === "POST" && c.url.endsWith("/api/settings/mcp/1c"));
      expect(post).toBeTruthy();
      const parsed = JSON.parse(post!.body!) as { username: string; password: string };
      expect(parsed.username).toBe("admin");
      expect(parsed.password).toBe("p4ssw0rd");
    });
    await waitFor(() =>
      expect((screen.getByTestId("1c-pwd") as HTMLInputElement).value).toBe("")
    );
  });
});
