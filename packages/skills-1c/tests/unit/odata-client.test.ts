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
import { OneCAuthError, OneCNotFoundError } from "../../src/errors.js";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const client = new OdataClient(
  { odataUrl: ODATA, username: "u", password: "p" },
  { requestTimeoutMs: 5000 },
);

describe("OdataClient", () => {
  it("get() fetches a collection with $filter", async () => {
    const out = await client.get<{ value: unknown[] }>(
      "Document_РеализацияТоваровУслуг",
      {
        $filter: "Number eq '00001'",
        $top: "10",
      },
    );
    expect(out.value.length).toBeGreaterThan(0);
  });

  it("throws OneCAuthError on HTTP 401", async () => {
    await expect(client.get("Document_401")).rejects.toBeInstanceOf(
      OneCAuthError,
    );
  });

  it("throws OneCNotFoundError on HTTP 404", async () => {
    await expect(client.get("Document_404")).rejects.toBeInstanceOf(
      OneCNotFoundError,
    );
  });

  it("trims trailing slash from odata URL", async () => {
    const c = new OdataClient(
      { odataUrl: ODATA + "/", username: "u", password: "p" },
      { requestTimeoutMs: 5000 },
    );
    const out = await c.get<{ value: unknown[] }>(
      "Document_РеализацияТоваровУслуг",
    );
    expect(out.value.length).toBeGreaterThan(0);
  });
});
