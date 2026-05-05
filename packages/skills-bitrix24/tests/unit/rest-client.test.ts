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
import { AuthExpiredError, RateLimitedError } from "../../src/errors.js";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const client = new CrestClient(
  { portalUrl: PORTAL, webhookToken: WEBHOOK },
  {
    requestTimeoutMs: 5000,
    maxRetries: 0,
  },
);

describe("CrestClient", () => {
  it("call() POSTs to /rest/{token}/{method}.json and returns result", async () => {
    const r = await client.call<
      { ID: string; TITLE: string }[]
    >("crm.deal.list", { filter: { "%TITLE": "Иванов" } });
    expect(r[0]!.ID).toBe("1001");
    expect(r[0]!.TITLE).toContain("Иванов");
  });

  it("throws AuthExpiredError on HTTP 401", async () => {
    await expect(client.call("crm.deal.list.401", {})).rejects.toBeInstanceOf(
      AuthExpiredError,
    );
  });

  it("throws RateLimitedError on HTTP 429 and parses Retry-After", async () => {
    try {
      await client.call("crm.deal.list.429", {});
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(RateLimitedError);
      expect((err as RateLimitedError).retryAfterSec).toBe(10);
    }
  });

  it("trims trailing slash from portal URL", async () => {
    const c = new CrestClient(
      { portalUrl: PORTAL + "/", webhookToken: WEBHOOK },
      { requestTimeoutMs: 5000, maxRetries: 0 },
    );
    const r = await c.call<{ ID: string }[]>("crm.deal.list", {});
    expect(r[0]!.ID).toBe("1001");
  });
});
