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
import { leadsCreate } from "../../src/tools/leads.js";

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const client = new CrestClient(
  { portalUrl: PORTAL, webhookToken: WEBHOOK },
  { requestTimeoutMs: 5000, maxRetries: 0 },
);

describe("bitrix24.leads.create", () => {
  it("creates a lead and returns its id", async () => {
    const out = await leadsCreate(client, {
      title: "Запрос с лендинга",
      contact_name: "Иванов Иван Петрович",
      contact_phone: "+7 999 111 22 33",
      contact_email: "ivanov@example.ru",
      source: "brikko_studio",
    });
    expect(out.id).toBe("9001");
  });

  it("accepts minimal args (no phone/email/comments)", async () => {
    const out = await leadsCreate(client, {
      title: "Заявка",
      contact_name: "Петров",
      source: "brikko_studio",
    });
    expect(out.id).toBe("9001");
  });
});
