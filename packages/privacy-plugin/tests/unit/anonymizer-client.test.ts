import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { handlers, ANON_BASE } from "../mocks/anonymizer-handlers.js";
import { AnonymizerClient } from "../../src/anonymizer-client.js";
import {
  AnonymizerRequestError,
  AnonymizerUnavailableError,
} from "../../src/errors.js";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const cfg = {
  anonymizerUrl: ANON_BASE,
  requestTimeoutMs: 1000,
  circuitBreakerMs: 30_000,
  toolPoliciesPath: "/dev/null",
  debugLogging: false,
  maxRetries: 3,
  retryBaseDelayMs: 5,
};

const client = new AnonymizerClient(cfg);

const wsId = "ws_test";
const reqId = "req_abc";

describe("AnonymizerClient", () => {
  it("anonymize() masks Russian PII", async () => {
    const out = await client.anonymize({
      workspace_id: wsId,
      request_id: reqId,
      text: "Передай Иванову ИНН 7707083893",
      session_id: "ses_1",
      policy_profile: "balanced",
    });
    expect(out.masked_text).toContain("<NAME_1>");
    expect(out.masked_text).toContain("<INN_1>");
    expect(out.entities.length).toBe(2);
    expect(out.entities[0]?.category).toBe("PERSON");
    expect(out.degraded_mode).toBe(false);
    expect(out.request_id).toBe(reqId);
    expect(typeof out.latency_ms).toBe("number");
  });

  it("anonymize() returns text unchanged when no PII", async () => {
    const out = await client.anonymize({
      workspace_id: wsId,
      request_id: reqId,
      text: "Привет мир",
      session_id: "ses_1",
      policy_profile: "balanced",
    });
    expect(out.masked_text).toBe("Привет мир");
    expect(out.entities).toEqual([]);
  });

  it("restore() unmasks placeholders", async () => {
    const out = await client.restore({
      workspace_id: wsId,
      request_id: reqId,
      text: "Передам <NAME_1> о <INN_1>",
    });
    expect(out.restored_text).toBe("Передам Иванову о 7707083893");
    expect(out.hallucinated).toEqual([]);
  });

  it("toolCallDeanonymize() rewrites placeholder args", async () => {
    const out = await client.toolCallDeanonymize({
      workspace_id: wsId,
      request_id: reqId,
      tool_name: "bitrix24.deals.list",
      args: { client: "<NAME_1>", period: "Q1-2026" },
      policy: "deanonymize",
    });
    expect(out.args["client"]).toBe("Иванов Иван Петрович");
    expect(out.args["period"]).toBe("Q1-2026");
    expect(out.deanonymized_keys).toContain("client");
  });

  it("toolCallDeanonymize() throws AnonymizerRequestError on 403 trust_violation", async () => {
    await expect(
      client.toolCallDeanonymize({
        workspace_id: wsId,
        request_id: reqId,
        tool_name: "third_party_ai.send",
        args: { msg: "<NAME_1>" },
        policy: "deanonymize",
      }),
    ).rejects.toBeInstanceOf(AnonymizerRequestError);
  });

  it("getStats() returns category counts", async () => {
    const out = await client.getStats(wsId);
    expect(out.categories["PERSON"]).toBe(47);
    expect(out.total_mappings).toBe(62);
    expect(out.degraded_mode).toBe(false);
  });

  it("listAudit() paginates", async () => {
    const out = await client.listAudit(wsId, { limit: 100, offset: 0 });
    expect(out.events.length).toBeGreaterThan(0);
    expect(out.events[0]?.event_type).toBe("anonymize");
    expect(out.events[0]?.workspace_id).toBe(wsId);
  });

  it("listAudit() forwards optional category and since filters", async () => {
    let receivedUrl: URL | null = null;
    server.use(
      http.get(`${ANON_BASE}/workspaces/:wsId/audit`, ({ request }) => {
        receivedUrl = new URL(request.url);
        return HttpResponse.json({
          events: [],
          total: 0,
          next_offset: null,
        });
      }),
    );
    await client.listAudit(wsId, {
      limit: 50,
      offset: 10,
      category: "INN",
      since: "2026-05-01T00:00:00Z",
    });
    expect(receivedUrl).not.toBeNull();
    const u = receivedUrl as unknown as URL;
    expect(u.searchParams.get("category")).toBe("INN");
    expect(u.searchParams.get("since")).toBe("2026-05-01T00:00:00Z");
    expect(u.searchParams.get("limit")).toBe("50");
    expect(u.searchParams.get("offset")).toBe("10");
  });

  it("purge() with scope=all returns deleted count", async () => {
    const out = await client.purge(wsId, { scope: "all" });
    expect(out.deleted_mappings).toBe(62);
    expect(out.deleted_audit_events).toBe(0);
  });

  it("anonymize() throws AnonymizerUnavailableError when sidecar is offline", async () => {
    const offlineClient = new AnonymizerClient({
      ...cfg,
      anonymizerUrl: "http://127.0.0.1:1",
      requestTimeoutMs: 250,
      maxRetries: 1, // keep test fast
    });
    await expect(
      offlineClient.anonymize({
        workspace_id: wsId,
        request_id: reqId,
        text: "x",
        session_id: "ses_1",
        policy_profile: "balanced",
      }),
    ).rejects.toBeInstanceOf(AnonymizerUnavailableError);
  });

  it("retries 5xx responses with exponential backoff", async () => {
    let attempts = 0;
    server.use(
      http.post(`${ANON_BASE}/anonymize`, async () => {
        attempts++;
        if (attempts < 3) {
          return new HttpResponse("upstream busy", { status: 503 });
        }
        return HttpResponse.json({
          masked_text: "ok",
          entities: [],
          request_id: "r",
          degraded_mode: false,
          latency_ms: 1,
        });
      }),
    );
    const out = await client.anonymize({
      workspace_id: wsId,
      request_id: "r",
      text: "needs retry",
      session_id: "ses_1",
      policy_profile: "balanced",
    });
    expect(out.masked_text).toBe("ok");
    expect(attempts).toBe(3);
  });

  it("does NOT retry 4xx responses (client error is final)", async () => {
    let attempts = 0;
    server.use(
      http.post(`${ANON_BASE}/anonymize`, async () => {
        attempts++;
        return new HttpResponse(JSON.stringify({ detail: "bad" }), {
          status: 400,
          headers: { "content-type": "application/json" },
        });
      }),
    );
    await expect(
      client.anonymize({
        workspace_id: wsId,
        request_id: "r",
        text: "bad",
        session_id: "ses_1",
        policy_profile: "balanced",
      }),
    ).rejects.toBeInstanceOf(AnonymizerRequestError);
    expect(attempts).toBe(1);
  });

  it("reads BRIKKO_ANONYMIZER_URL from env via loadConfigFromEnv", async () => {
    const { loadConfigFromEnv } = await import("../../src/config.js");
    const c = loadConfigFromEnv({
      BRIKKO_ANONYMIZER_URL: "http://example.local:9000",
      BRIKKO_ANONYMIZER_TIMEOUT_MS: "2500",
    });
    expect(c.anonymizerUrl).toBe("http://example.local:9000");
    expect(c.requestTimeoutMs).toBe(2500);
  });

  it("loadConfigFromEnv applies defaults when env is empty", async () => {
    const { loadConfigFromEnv } = await import("../../src/config.js");
    const c = loadConfigFromEnv({});
    expect(c.anonymizerUrl).toBe("http://anonymizer:8403");
    expect(c.requestTimeoutMs).toBe(5000);
    expect(c.maxRetries).toBe(3);
  });
});
