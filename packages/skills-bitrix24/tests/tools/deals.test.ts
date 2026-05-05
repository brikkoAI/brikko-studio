import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";
import { setupServer } from "msw/node";
import { handlers, PORTAL, WEBHOOK } from "../mocks/bitrix-handlers.js";
import { CrestClient } from "../../src/rest-client.js";
import { dealsGet, dealsList, parsePeriod } from "../../src/tools/deals.js";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const client = new CrestClient(
  { portalUrl: PORTAL, webhookToken: WEBHOOK },
  { requestTimeoutMs: 5000, maxRetries: 0 },
);

describe("bitrix24.deals.list", () => {
  it("returns mapped Deal[] from CrestClient response", async () => {
    const out = await dealsList(client, { client: "Иванов", limit: 10 });
    expect(out.length).toBeGreaterThan(0);
    expect(out[0]).toMatchObject({
      id: "1001",
      stage: "NEW",
      amount_rub: 150000,
    });
    expect(out[0]!.title).toContain("Иванов");
    expect(out[0]!.created_at).toMatch(/^2026-/);
  });

  it("works without filter (lists all)", async () => {
    const out = await dealsList(client, { limit: 5 });
    expect(out.length).toBeGreaterThan(0);
  });

  it("respects period filter (Q1-2026 sets DATE_CREATE bounds)", async () => {
    const out = await dealsList(client, { period: "Q1-2026", limit: 10 });
    expect(out.length).toBeGreaterThan(0);
  });

  it("respects ISO range period filter", async () => {
    const out = await dealsList(client, {
      period: "2026-01-01..2026-03-31",
      limit: 10,
    });
    expect(out.length).toBeGreaterThan(0);
  });

  it("caps results at limit", async () => {
    const out = await dealsList(client, { limit: 1 });
    expect(out.length).toBe(1);
  });

  it("emits empty client_name (filled later by privacy plugin)", async () => {
    const out = await dealsList(client, { limit: 10 });
    expect(out[0]!.client_name).toBe("");
  });
});

describe("bitrix24.deals.get", () => {
  it("returns single Deal by id", async () => {
    const out = await dealsGet(client, { deal_id: "1001" });
    expect(out.id).toBe("1001");
    expect(out.amount_rub).toBe(100000);
    expect(out.stage).toBe("WON");
  });
});

describe("parsePeriod", () => {
  it("parses Q2-2026 to Apr-Jun 2026", () => {
    const [from, to] = parsePeriod("Q2-2026");
    expect(from).toBe("2026-04-01T00:00:00");
    expect(to).toBe("2026-06-30T23:59:59");
  });

  it("parses YTD to current year", () => {
    const y = new Date().getFullYear();
    const [from, to] = parsePeriod("YTD");
    expect(from).toBe(`${y}-01-01T00:00:00`);
    expect(to).toBe(`${y}-12-31T23:59:59`);
  });

  it("parses ISO range", () => {
    const [from, to] = parsePeriod("2026-04-01..2026-04-30");
    expect(from).toBe("2026-04-01T00:00:00");
    expect(to).toBe("2026-04-30T23:59:59");
  });

  it("throws on unrecognised period", () => {
    expect(() => parsePeriod("garbage")).toThrow(/unrecognised/);
  });
});
