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
import { contactsSearch } from "../../src/tools/contacts.js";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const client = new CrestClient(
  { portalUrl: PORTAL, webhookToken: WEBHOOK },
  { requestTimeoutMs: 5000, maxRetries: 0 },
);

describe("bitrix24.contacts.search", () => {
  it("returns Contact[] matching the query", async () => {
    const out = await contactsSearch(client, { query: "Иван", limit: 10 });
    expect(out[0]!.name).toContain("Иван");
    expect(out[0]!.phone).toContain("+7");
    expect(out[0]!.email).toBe("ivanov@example.ru");
  });

  it("caps at limit", async () => {
    const out = await contactsSearch(client, { query: "test", limit: 1 });
    expect(out.length).toBeLessThanOrEqual(1);
  });
});
