/**
 * MSW handlers that mock the local Brikko Anonymizer sidecar.
 *
 * Field shapes mirror `anonymizer/brikko_anonymizer/schemas.py` verbatim.
 * If the Python schemas evolve, update both files in lockstep.
 */
import { http, HttpResponse } from "msw";

export const ANON_BASE = "http://anonymizer:8403";

export const handlers = [
  // POST /anonymize ------------------------------------------------------
  http.post(`${ANON_BASE}/anonymize`, async ({ request }) => {
    const body = (await request.json()) as {
      text: string;
      workspace_id: string;
      request_id: string;
      policy_profile?: string;
      session_id?: string;
    };
    const isPii =
      body.text.includes("Иванов") && body.text.includes("7707083893");
    if (isPii) {
      return HttpResponse.json({
        masked_text: body.text
          .replace("Иванову", "<NAME_1>")
          .replace("7707083893", "<INN_1>"),
        entities: [
          { placeholder: "<NAME_1>", category: "PERSON", confidence: 0.92 },
          { placeholder: "<INN_1>", category: "INN", confidence: 1.0 },
        ],
        request_id: body.request_id,
        degraded_mode: false,
        latency_ms: 12,
      });
    }
    return HttpResponse.json({
      masked_text: body.text,
      entities: [],
      request_id: body.request_id,
      degraded_mode: false,
      latency_ms: 5,
    });
  }),

  // POST /restore -------------------------------------------------------
  http.post(`${ANON_BASE}/restore`, async ({ request }) => {
    const body = (await request.json()) as {
      text: string;
      workspace_id: string;
      request_id: string;
    };
    const restored = body.text
      .replace("<NAME_1>", "Иванову")
      .replace("<INN_1>", "7707083893");
    return HttpResponse.json({
      restored_text: restored,
      hallucinated: [] as Array<{ placeholder: string }>,
      request_id: body.request_id,
      latency_ms: 3,
    });
  }),

  // POST /tool_call/deanonymize -----------------------------------------
  http.post(`${ANON_BASE}/tool_call/deanonymize`, async ({ request }) => {
    const body = (await request.json()) as {
      tool_name: string;
      args: Record<string, unknown>;
      policy?: string;
      workspace_id: string;
      request_id: string;
    };
    if (body.tool_name === "third_party_ai.send") {
      return HttpResponse.json(
        {
          detail: {
            error: "trust_violation",
            message: `tool '${body.tool_name}' is denied by policy`,
          },
        },
        { status: 403 },
      );
    }
    const args: Record<string, unknown> = { ...body.args };
    const deanonymized: string[] = [];
    if (typeof args["client"] === "string" && args["client"] === "<NAME_1>") {
      args["client"] = "Иванов Иван Петрович";
      deanonymized.push("client");
    }
    return HttpResponse.json({
      args,
      deanonymized_keys: deanonymized,
      request_id: body.request_id,
    });
  }),

  // GET /workspaces/:wsId/stats -----------------------------------------
  http.get(`${ANON_BASE}/workspaces/:wsId/stats`, ({ params }) => {
    return HttpResponse.json({
      workspace_id: params["wsId"],
      categories: { PERSON: 47, INN: 3, PHONE_RU: 12 },
      total_mappings: 62,
      audit_events_last_24h: 318,
      degraded_mode: false,
    });
  }),

  // GET /workspaces/:wsId/audit -----------------------------------------
  http.get(`${ANON_BASE}/workspaces/:wsId/audit`, ({ request, params }) => {
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? "100");
    const wsId = String(params["wsId"]);
    const events = Array.from({ length: Math.min(limit, 3) }).map((_, i) => ({
      timestamp: new Date(Date.now() - i * 1000).toISOString(),
      workspace_id: wsId,
      event_type: "anonymize",
      category: "PERSON",
      placeholder: `<NAME_${i + 1}>`,
      request_id: `req_${i}`,
      policy_profile: "balanced",
      degraded_mode: "full",
      tool_name: null,
    }));
    return HttpResponse.json({ events, total: 3, next_offset: null });
  }),

  // POST /workspaces/:wsId/purge ----------------------------------------
  http.post(`${ANON_BASE}/workspaces/:wsId/purge`, async ({ request }) => {
    const body = (await request.json()) as { scope?: string };
    return HttpResponse.json({
      deleted_mappings: body.scope === "all" ? 62 : 5,
      deleted_audit_events: 0,
    });
  }),
];
