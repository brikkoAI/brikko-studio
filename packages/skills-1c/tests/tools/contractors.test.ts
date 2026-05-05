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
import { contractorsSearch } from "../../src/tools/contractors.js";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const client = new OdataClient(
  { odataUrl: ODATA, username: "u", password: "p" },
  { requestTimeoutMs: 5000 },
);

describe("1c.contractors.search", () => {
  it("filters by INN", async () => {
    const out = await contractorsSearch(client, {
      inn: "7707083893",
      limit: 10,
    });
    expect(out[0]!.inn).toBe("7707083893");
  });

  it("filters by name substring", async () => {
    const out = await contractorsSearch(client, {
      name_query: "Иванов",
      limit: 10,
    });
    expect(out[0]!.name).toMatch(/Иванов/);
  });

  it("escapes single quote in name_query", async () => {
    // Mostly a regression / no-throw assertion.
    const out = await contractorsSearch(client, {
      name_query: "O'Brien",
      limit: 10,
    });
    expect(out.length).toBeGreaterThan(0);
  });
});
