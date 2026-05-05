/**
 * REST client for the privacy admin API.
 *
 * Endpoints (proxied by core to the anonymizer admin service from M1 Task 15):
 *   GET  /api/privacy/stats              — workspace stats: counts per category, audit volume
 *   GET  /api/privacy/audit?limit&offset&category&since
 *   POST /api/privacy/purge              — delete all mappings (irreversible)
 *
 * No auth header here — core's auth-api session cookie is reused on the same origin.
 */

export interface PrivacyStats {
  workspace_id: string;
  categories: Record<string, number>;
  total_mappings: number;
  audit_events_last_24h: number;
  degraded_mode: boolean;
}

export interface AuditEvent {
  timestamp: string;
  event_type: string;
  category: string;
  placeholder: string;
  request_id: string;
  policy_profile: string;
}

export interface AuditPage {
  events: AuditEvent[];
  total: number;
  next_offset: number | null;
}

export interface AuditQueryOpts {
  limit: number;
  offset: number;
  category?: string;
  since?: string;
}

const BASE = "/api/privacy";

async function jsonOrThrow<T>(res: Response, label: string): Promise<T> {
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${label} failed: ${res.status} ${body.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

export async function fetchStats(): Promise<PrivacyStats> {
  const res = await fetch(`${BASE}/stats`);
  return jsonOrThrow<PrivacyStats>(res, "stats");
}

export async function fetchAudit(opts: AuditQueryOpts): Promise<AuditPage> {
  const u = new URL(`${BASE}/audit`, window.location.origin);
  u.searchParams.set("limit", String(opts.limit));
  u.searchParams.set("offset", String(opts.offset));
  if (opts.category) u.searchParams.set("category", opts.category);
  if (opts.since) u.searchParams.set("since", opts.since);
  const res = await fetch(u);
  return jsonOrThrow<AuditPage>(res, "audit");
}

export async function purgeAll(): Promise<{ deleted_mappings: number }> {
  const res = await fetch(`${BASE}/purge`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ scope: "all" }),
  });
  return jsonOrThrow<{ deleted_mappings: number }>(res, "purge");
}
