import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";
import { setupServer } from "msw/node";
import { handlers, ODATA } from "../mocks/odata-handlers.js";
import { OdataClient } from "../../src/odata-client.js";
import { documentsList, parsePeriod } from "../../src/tools/documents.js";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const client = new OdataClient(
  { odataUrl: ODATA, username: "u", password: "p" },
  { requestTimeoutMs: 5000 },
);

describe("1c.documents.list", () => {
  it("returns Document[] for sale type", async () => {
    const out = await documentsList(client, { type: "sale", limit: 10 });
    expect(out.length).toBeGreaterThan(0);
    expect(out[0]).toMatchObject({
      number: expect.stringMatching(/^00001/),
      amount_rub: 150000,
    });
  });

  it("filters by period (Q2-2026)", async () => {
    const out = await documentsList(client, {
      type: "sale",
      period: "Q2-2026",
      limit: 10,
    });
    expect(out.length).toBeGreaterThan(0);
  });

  it("supports purchase type", async () => {
    const out = await documentsList(client, { type: "purchase", limit: 10 });
    expect(out[0]!.number).toBe("PUR-001");
  });

  it("supports payment_in type", async () => {
    const out = await documentsList(client, {
      type: "payment_in",
      limit: 10,
    });
    expect(out[0]!.number).toBe("PIN-001");
  });

  it("supports payment_out type", async () => {
    const out = await documentsList(client, {
      type: "payment_out",
      limit: 10,
    });
    expect(out[0]!.number).toBe("POUT-001");
  });

  it("respects $top via limit", async () => {
    const out = await documentsList(client, { type: "sale", limit: 1 });
    expect(out.length).toBe(1);
  });

  it("emits contractor_ref when present", async () => {
    const out = await documentsList(client, { type: "sale", limit: 10 });
    expect(out[0]!.contractor_ref).toBe("ctr-1");
  });
});

describe("parsePeriod (1C)", () => {
  it("parses Q3-2026 to Jul-Sep 2026", () => {
    const [from, to] = parsePeriod("Q3-2026");
    expect(from).toBe("2026-07-01T00:00:00");
    expect(to).toBe("2026-09-30T23:59:59");
  });

  it("parses YTD", () => {
    const y = new Date().getFullYear();
    const [from, to] = parsePeriod("YTD");
    expect(from).toBe(`${y}-01-01T00:00:00`);
    expect(to).toBe(`${y}-12-31T23:59:59`);
  });

  it("throws on garbage", () => {
    expect(() => parsePeriod("not-a-period")).toThrow(/unrecognised/);
  });
});
