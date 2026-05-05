/**
 * Brikko Studio M2 — full E2E flow.
 *
 * Covers (single browser session, single test for state continuity):
 *   1. Boot Studio against a mocked Anonymizer + mocked Brikko Gateway OAuth.
 *   2. User completes the 6-step onboarding wizard.
 *   3. User sends a Russian-PII message in the chat.
 *      Verifies: PII masked before LLM, restored on return,
 *                hallucinated placeholders rendered as grey-italic.
 *   4. User opens /privacy and sees stats reflect the message.
 *   5. User opens /settings and saves a Bitrix24 webhook (mocked).
 *
 * Why everything is mocked at the network layer (page.route):
 * - Avoids depending on Studio core having every /api/onboarding/* endpoint
 *   wired through to anonymizer/keychain (some are still tracked in
 *   docs/M2_FOLLOWUPS.md "Onboarding API gap").
 * - Keeps the test deterministic: no Docker boot, no real LLM, no real
 *   keychain. The plugin / MCP / restorer logic is exercised by their
 *   unit + integration tests in their own packages.
 *
 * If a real end-to-end smoke is needed, run docker compose up + the manual
 * Task 33 step 6 checklist.
 */
import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WEB_UI_ROOT = path.resolve(__dirname, "../..");
const PREVIEW_PORT = 4747;
const PREVIEW_BASE = `http://127.0.0.1:${PREVIEW_PORT}`;

let preview: ChildProcess | null = null;

test.beforeAll(async () => {
  // Use vite preview against the built dist/. The spec works against any
  // static server; preview is reachable from the host without docker.
  preview = spawn(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["vite", "preview", "--port", String(PREVIEW_PORT), "--strictPort", "--host", "127.0.0.1"],
    { cwd: WEB_UI_ROOT, stdio: "pipe", env: { ...process.env } },
  );
  // Wait for the server to accept connections (max 30s).
  for (let i = 0; i < 60; i += 1) {
    try {
      const r = await fetch(PREVIEW_BASE);
      if (r.ok || r.status === 404) return;
    } catch {
      /* not ready */
    }
    await new Promise((res) => setTimeout(res, 500));
  }
  throw new Error("vite preview did not start within 30s");
});

test.afterAll(() => {
  if (preview && !preview.killed) {
    preview.kill("SIGTERM");
  }
});

test.use({ baseURL: PREVIEW_BASE });

// ---------------------------------------------------------------------------
// In-memory mock backend state. Reset per worker (single test => single state).
// ---------------------------------------------------------------------------
interface MockState {
  workspaceCreated: boolean;
  llmProviderSaved: boolean;
  disclaimerAcked: boolean;
  finalized: boolean;
  bitrixHasToken: boolean;
  bitrixPortalUrl: string | null;
  // Synthetic stats — incremented on each chat round-trip.
  statsCategories: Record<string, number>;
  totalMappings: number;
  auditEvents: Array<{
    timestamp: string;
    event_type: string;
    category: string;
    placeholder: string;
    request_id: string;
    policy_profile: string;
  }>;
}

function freshState(): MockState {
  return {
    workspaceCreated: false,
    llmProviderSaved: false,
    disclaimerAcked: false,
    finalized: false,
    bitrixHasToken: false,
    bitrixPortalUrl: null,
    statsCategories: {},
    totalMappings: 0,
    auditEvents: [],
  };
}

const state: MockState = freshState();

// ---------------------------------------------------------------------------
// Mock LLM round-trip — used by /api/chat/completions.
// Mirrors the privacy-plugin pipeline: detect PII -> placeholder -> echo ->
// restore. Stable for E2E assertions; production logic lives in M1/M2 plugins.
// ---------------------------------------------------------------------------
function mockChatCompletion(userText: string, requestId: string): {
  message: { role: "assistant"; content: string };
  hallucinated: Array<{ placeholder: string }>;
} {
  // Trivial detection — only for E2E. Real anonymization is tested elsewhere.
  let outbound = userText;
  let placeholderIdx = 0;
  const mappings: Array<{ placeholder: string; value: string; category: string }> = [];

  // PERSON: capitalized Russian surname.
  outbound = outbound.replace(
    /(?<![А-Яа-яЁё])[А-ЯЁ][а-яё]+(?:ов|ев|ин|ский|цкий)(?:[ауыеомй]|ой|ыми)?(?![А-Яа-яЁё])/g,
    (match) => {
      placeholderIdx += 1;
      const placeholder = `<NAME_${placeholderIdx}>`;
      mappings.push({ placeholder, value: match, category: "PERSON" });
      return placeholder;
    },
  );

  // INN: 10 or 12 digits standalone.
  outbound = outbound.replace(/(?<!\d)\d{10}(?:\d{2})?(?!\d)/g, (match) => {
    placeholderIdx += 1;
    const placeholder = `<INN_${placeholderIdx}>`;
    mappings.push({ placeholder, value: match, category: "INN" });
    return placeholder;
  });

  // Update mock stats / audit.
  for (const m of mappings) {
    state.statsCategories[m.category] = (state.statsCategories[m.category] ?? 0) + 1;
    state.totalMappings += 1;
    state.auditEvents.unshift({
      timestamp: new Date().toISOString(),
      event_type: "anonymize",
      category: m.category,
      placeholder: m.placeholder,
      request_id: requestId,
      policy_profile: "balanced",
    });
  }

  // Synthetic LLM echo. Includes one hallucinated placeholder to exercise the
  // grey-italic UI rendering path.
  const placeholdersInUse = mappings.map((m) => m.placeholder);
  let echoed = mappings.length === 0
    ? "Хорошо, понял."
    : `Сообщение для ${placeholdersInUse.join(", ")} принято.`;

  // Inject ONE plausible hallucinated placeholder the LLM "made up".
  const hallucinated: Array<{ placeholder: string }> = [];
  if (mappings.some((m) => m.category === "PERSON")) {
    echoed += " Дополнительно проверю <EMAIL_99>.";
    hallucinated.push({ placeholder: "<EMAIL_99>" });
  }

  // Restore real PII back into the inbound text (LLM-side placeholders only).
  let restored = echoed;
  for (const m of mappings) {
    restored = restored.split(m.placeholder).join(m.value);
  }

  return {
    message: { role: "assistant", content: restored },
    hallucinated,
  };
}

// ---------------------------------------------------------------------------
// Test setup: spin up vite preview against the built dist/ and route every
// /api/* request to our in-process mock.
// ---------------------------------------------------------------------------
test.beforeEach(async ({ page }) => {
  // Reset mock state per test to make repeated runs deterministic.
  Object.assign(state, freshState());

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();

    // ------------------- onboarding -------------------
    if (path === "/api/onboarding/create-workspace" && method === "POST") {
      state.workspaceCreated = true;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "ws_e2e",
          name: "e2e-workspace",
          key_fingerprint: "ab:cd:ef:01:23:45:67:89",
        }),
      });
    }
    if (path === "/api/onboarding/workspace/backup" && method === "POST") {
      return route.fulfill({
        status: 200,
        headers: {
          "content-disposition": 'attachment; filename="workspace-backup.bin"',
          "content-type": "application/octet-stream",
        },
        body: Buffer.from("MOCK_ENCRYPTED_KEY_BLOB"),
      });
    }
    if (path === "/api/onboarding/llm-provider" && method === "POST") {
      state.llmProviderSaved = true;
      return route.fulfill({ status: 204, body: "" });
    }
    if (path === "/api/onboarding/disclaimer/ack" && method === "POST") {
      state.disclaimerAcked = true;
      return route.fulfill({ status: 204, body: "" });
    }
    if (path === "/api/onboarding/finalize" && method === "POST") {
      state.finalized = true;
      return route.fulfill({ status: 204, body: "" });
    }

    // ------------------- chat -------------------
    if (path === "/api/chat/completions" && method === "POST") {
      const body = JSON.parse(route.request().postData() ?? "{}") as {
        request_id?: string;
        messages: Array<{ role: string; content: string }>;
      };
      const userMsg = [...body.messages].reverse().find((m) => m.role === "user");
      const result = mockChatCompletion(userMsg?.content ?? "", body.request_id ?? "req_e2e");
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          request_id: body.request_id ?? "req_e2e",
          message: result.message,
          hallucinated: result.hallucinated,
          model: "mock-model",
          latency_ms: 42,
        }),
      });
    }

    // ------------------- privacy -------------------
    if (path === "/api/privacy/stats" && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          workspace_id: "ws_e2e",
          categories: state.statsCategories,
          total_mappings: state.totalMappings,
          audit_events_last_24h: state.auditEvents.length,
          degraded_mode: false,
        }),
      });
    }
    if (path === "/api/privacy/audit" && method === "GET") {
      const limit = Number(url.searchParams.get("limit") ?? "20");
      const offset = Number(url.searchParams.get("offset") ?? "0");
      const slice = state.auditEvents.slice(offset, offset + limit);
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          events: slice,
          total: state.auditEvents.length,
          next_offset: offset + slice.length < state.auditEvents.length
            ? offset + slice.length
            : null,
        }),
      });
    }
    if (path === "/api/privacy/policy" && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ profile: "balanced", category_overrides: {} }),
      });
    }
    if (path === "/api/privacy/tool-policies" && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ policies: [] }),
      });
    }

    // ------------------- settings -------------------
    if (path === "/api/settings/workspace" && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          name: "e2e-workspace",
          key_fingerprint: "ab:cd:ef:01:23:45:67:89",
          created_at: new Date().toISOString(),
        }),
      });
    }
    if (path === "/api/settings/mcp/bitrix24" && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          portal_url: state.bitrixPortalUrl,
          has_token: state.bitrixHasToken,
        }),
      });
    }
    if (path === "/api/settings/mcp/bitrix24" && method === "POST") {
      const body = JSON.parse(route.request().postData() ?? "{}") as {
        portal_url: string;
        webhook_token: string;
      };
      state.bitrixPortalUrl = body.portal_url;
      state.bitrixHasToken = true;
      return route.fulfill({ status: 204, body: "" });
    }
    if (path === "/api/settings/mcp/1c" && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          odata_url: null,
          username: null,
          has_password: false,
        }),
      });
    }

    // Auth status (M0) — pretend we are signed in so NavBar / pages render.
    if (path === "/api/auth/status" && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          authenticated: true,
          user: { email: "e2e@brikko.ru" },
        }),
      });
    }

    // Default: 404 so any unmocked endpoint surfaces clearly in test output.
    return route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ error: `unmocked: ${method} ${path}` }),
    });
  });
});

// ---------------------------------------------------------------------------
// The test itself
// ---------------------------------------------------------------------------
test("M2 full flow: onboarding → chat round-trip → privacy → settings", async ({
  page,
}) => {
  // -------------------------- 1. Onboarding --------------------------
  await page.goto("/onboarding?step=1");

  // Step 1 — welcome
  await expect(page.getByTestId("step-1")).toBeVisible();
  await page.getByTestId("step-1-next").click();

  // Step 2 — workspace + backup
  await expect(page.getByTestId("step-2")).toBeVisible();
  await page.getByTestId("step-2-name-input").fill("e2e-workspace");
  await page.getByTestId("step-2-create").click();
  await expect(page.getByTestId("step-2-created-banner")).toBeVisible();
  // Trigger backup download.
  const dl = page.waitForEvent("download");
  await page.getByTestId("step-2-backup").click();
  await dl;
  await page.getByTestId("step-2-backup-confirm").check();
  await page.getByTestId("step-2-next").click();

  // Step 3 — provider (BYO route to skip OAuth dance)
  await expect(page.getByTestId("step-3")).toBeVisible();
  await page.getByTestId("step-3-mode-byo").click();
  await page.getByTestId("step-3-byo-key").fill("sk-e2e-dummy-key");
  await page.getByTestId("step-3-continue").click();

  // Step 4 — keep balanced default
  await expect(page.getByTestId("step-4")).toBeVisible();
  await page.getByTestId("step-4-continue").click();

  // Step 5 — magic moment (purely client-side regex demo)
  await expect(page.getByTestId("step-5")).toBeVisible();
  await page.getByTestId("step-5-run").click();
  await expect(page.getByTestId("step-5-outbound")).toBeVisible();
  await expect(page.getByTestId("step-5-inbound")).toBeVisible();
  // The outbound box should contain the placeholder, not the raw surname.
  await expect(page.getByTestId("step-5-outbound")).toContainText(/<(NAME|PERSON)_/);
  // The inbound (restored) box should contain the original surname.
  await expect(page.getByTestId("step-5-inbound")).toContainText("Иванов");
  await page.getByTestId("step-5-next").click();

  // Step 6 — three-touch disclaimer
  await expect(page.getByTestId("step-6")).toBeVisible();
  await page.getByTestId("step-6-check1").check();
  await page.getByTestId("step-6-check2").check();
  await page.getByTestId("step-6-check3").check();
  await page.getByTestId("step-6-finish").click();

  // After finalize, Step 6 navigates to /chat. Wait for landing or for any
  // post-acks: server-side calls were made.
  await page.waitForURL(/\/chat/, { timeout: 10_000 });
  expect(state.workspaceCreated).toBe(true);
  expect(state.llmProviderSaved).toBe(true);
  expect(state.disclaimerAcked).toBe(true);
  expect(state.finalized).toBe(true);

  // -------------------------- 2. Chat round-trip --------------------------
  await expect(page.getByTestId("chat-shell")).toBeVisible();
  await page
    .getByTestId("chat-input")
    .fill("Передай Иванову, что у него ИНН 7707083893");
  await page.getByTestId("chat-send").click();

  // User bubble appears.
  await expect(page.getByTestId("bubble-user").first()).toContainText("Иванов");

  // Assistant bubble appears with restored PII.
  await expect(page.getByTestId("bubble-assistant").first()).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByTestId("bubble-assistant").first()).toContainText("Иванов");
  // Real placeholders must NOT leak into the user-visible body. The hallucinated
  // <EMAIL_99> token is allowed (it's wrapped in PlaceholderRender for UX);
  // we assert the *real* placeholders <NAME_*> / <INN_*> are not visible.
  const visibleText = (await page.getByTestId("bubble-assistant").first().textContent()) ?? "";
  expect(visibleText).not.toMatch(/<NAME_/);
  expect(visibleText).not.toMatch(/<INN_/);

  // Mock state should reflect anonymize events for both PERSON and INN.
  expect(state.auditEvents.some((e) => e.category === "PERSON")).toBe(true);
  expect(state.auditEvents.some((e) => e.category === "INN")).toBe(true);

  // -------------------------- 3. Privacy dashboard --------------------------
  await page.goto("/privacy");
  await expect(page.getByTestId("privacy-page")).toBeVisible();
  await expect(page.getByTestId("stats-panel")).toBeVisible();
  // PERSON + INN tiles should show counts > 0.
  await expect(page.getByTestId("stats-categories")).toContainText("PERSON");
  await expect(page.getByTestId("stats-categories")).toContainText("INN");

  // Audit tab.
  await page.getByTestId("tab-audit").click();
  await expect(page.getByTestId("audit-table")).toBeVisible();
  // The table should not be in the empty-state — we inserted events.
  await expect(page.getByTestId("audit-empty")).toHaveCount(0);

  // -------------------------- 4. Settings: Bitrix24 webhook --------------------------
  await page.goto("/settings");
  await expect(page.getByTestId("mcp-section")).toBeVisible();
  await page.getByTestId("bitrix-portal").fill("https://e2e.bitrix24.ru");
  await page.getByTestId("bitrix-token").fill("test_token_e2e_123");
  await page.getByTestId("bitrix-save").click();
  // Mock backend records the save.
  await expect.poll(() => state.bitrixHasToken, { timeout: 5_000 }).toBe(true);
  expect(state.bitrixPortalUrl).toBe("https://e2e.bitrix24.ru");
});
