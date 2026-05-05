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
import { reportsBalance } from "../../src/tools/reports.js";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const client = new OdataClient(
  { odataUrl: ODATA, username: "u", password: "p" },
  { requestTimeoutMs: 5000 },
);

describe("1c.reports.balance", () => {
  it("returns balance lines for the requested period", async () => {
    const out = await reportsBalance(client, { period: "YTD" });
    expect(out.length).toBeGreaterThan(0);
    expect(out[0]).toMatchObject({
      account: expect.any(String),
      amount_rub: expect.any(Number),
    });
  });

  it("maps Счёт_Key → account, Сумма → amount_rub", async () => {
    const out = await reportsBalance(client, { period: "Q1-2026" });
    expect(out.find((l) => l.account === "01")?.amount_rub).toBe(1500000);
    expect(out.find((l) => l.account === "51")?.amount_rub).toBe(850000);
  });
});
