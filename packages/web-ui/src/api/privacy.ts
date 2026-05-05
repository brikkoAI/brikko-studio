/**
 * REST client for the privacy admin API.
 *
 * Endpoints (proxied by core to the anonymizer admin service from M1 Task 15):
 *   GET  /api/privacy/stats              — workspace stats: counts per category, audit volume
 *   GET  /api/privacy/audit?limit&offset&category&since
 *   POST /api/privacy/purge              — delete all mappings (irreversible)
 *   GET  /api/privacy/policy             — read /etc/brikko/policy.yaml
 *   PUT  /api/privacy/policy             — write /etc/brikko/policy.yaml
 *   GET  /api/privacy/tool-policies      — read /etc/brikko/tool-policies.yaml
 *   PUT  /api/privacy/tool-policies      — write /etc/brikko/tool-policies.yaml
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

export type PolicyProfile = "strict" | "balanced" | "permissive";
export type CategorySensitivity = "low" | "medium" | "critical";

export interface PolicyConfig {
  profile: PolicyProfile;
  category_overrides: Record<string, CategorySensitivity>;
}

export interface ToolPolicy {
  pattern: string;
  args: "deanonymize" | "keep_anonymized";
  result: "anonymize" | "passthrough";
  trust: "trusted" | "untrusted";
}

export interface ToolPoliciesResponse {
  policies: ToolPolicy[];
}

const BASE = "/api/privacy";

async function jsonOrThrow<T>(res: Response, label: string): Promise<T> {
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${label} failed: ${res.status} ${body.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

async function okOrThrow(res: Response, label: string): Promise<void> {
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${label} failed: ${res.status} ${body.slice(0, 200)}`);
  }
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

export async function fetchPolicy(): Promise<PolicyConfig> {
  const res = await fetch(`${BASE}/policy`);
  return jsonOrThrow<PolicyConfig>(res, "policy");
}

export async function savePolicy(p: PolicyConfig): Promise<void> {
  const res = await fetch(`${BASE}/policy`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(p),
  });
  await okOrThrow(res, "policy save");
}

export async function fetchToolPolicies(): Promise<ToolPoliciesResponse> {
  const res = await fetch(`${BASE}/tool-policies`);
  return jsonOrThrow<ToolPoliciesResponse>(res, "tool-policies");
}

export async function saveToolPolicies(policies: ToolPolicy[]): Promise<void> {
  const res = await fetch(`${BASE}/tool-policies`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ policies }),
  });
  await okOrThrow(res, "tool-policies save");
}
