import { http, HttpResponse } from "msw";

export const PORTAL = "https://acme.bitrix24.ru";
export const WEBHOOK = "1/xyz";

const REST_BASE = `${PORTAL}/rest/${WEBHOOK}`;

export const handlers = [
  http.post(`${REST_BASE}/crm.deal.list.json`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      filter?: { TITLE?: string; "%TITLE"?: string };
      select?: string[];
    };
    const titleFilter = body?.filter?.TITLE ?? body?.filter?.["%TITLE"];
    return HttpResponse.json({
      result: [
        {
          ID: "1001",
          TITLE: titleFilter ? `Сделка с ${titleFilter}` : "Сделка с Ивановым",
          STAGE_ID: "NEW",
          OPPORTUNITY: "150000.00",
          DATE_CREATE: "2026-04-01T10:00:00+03:00",
          CONTACT_ID: "501",
        },
        {
          ID: "1002",
          TITLE: "Сделка 2",
          STAGE_ID: "PROCESSING",
          OPPORTUNITY: "75000.00",
          DATE_CREATE: "2026-04-15T12:00:00+03:00",
        },
      ],
      total: 2,
      time: { duration: 0.05 },
    });
  }),

  http.post(`${REST_BASE}/crm.deal.get.json`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as { id?: string };
    return HttpResponse.json({
      result: {
        ID: body.id ?? "1001",
        TITLE: "Сделка тест",
        STAGE_ID: "WON",
        OPPORTUNITY: "100000.00",
        DATE_CREATE: "2026-03-01T10:00:00+03:00",
      },
      time: { duration: 0.01 },
    });
  }),

  http.post(`${REST_BASE}/crm.contact.list.json`, async () => {
    return HttpResponse.json({
      result: [
        {
          ID: "501",
          NAME: "Иван",
          LAST_NAME: "Иванов",
          PHONE: [{ VALUE: "+7 999 111 22 33" }],
          EMAIL: [{ VALUE: "ivanov@example.ru" }],
        },
      ],
      total: 1,
      time: { duration: 0.02 },
    });
  }),

  http.post(`${REST_BASE}/crm.lead.add.json`, async () => {
    return HttpResponse.json({
      result: 9001,
      time: { duration: 0.03 },
    });
  }),

  // synthetic error endpoints used in tests
  http.post(`${REST_BASE}/crm.deal.list.401.json`, () => {
    return HttpResponse.json(
      { error: "INVALID_CREDENTIALS", error_description: "401" },
      { status: 401 },
    );
  }),

  http.post(`${REST_BASE}/crm.deal.list.429.json`, () => {
    return HttpResponse.json(
      { error: "QUERY_LIMIT_EXCEEDED" },
      { status: 429, headers: { "Retry-After": "10" } },
    );
  }),
];
