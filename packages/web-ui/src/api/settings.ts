/**
 * REST client for settings endpoints (proxied by core).
 *
 * Hard constraint #4: webhook tokens / passwords are stored via OS keychain
 * (keytar) on the server side — the GET endpoints NEVER return the raw token.
 * Status responses include `has_token` / `has_password` booleans only; the
 * UI uses these to render a 'saved' indicator + 'rotate' button.
 *
 * Endpoints:
 *   GET  /api/settings/workspace          → { name, key_fingerprint, created_at }
 *   POST /api/settings/workspace/backup   → encrypted blob (Content-Disposition)
 *   GET  /api/settings/mcp/bitrix24       → { portal_url, has_token }
 *   POST /api/settings/mcp/bitrix24       → save creds (write-only)
 *   POST /api/settings/mcp/bitrix24/test  → { ok, error? }
 *   GET  /api/settings/mcp/1c             → { odata_url, username, has_password }
 *   POST /api/settings/mcp/1c             → save creds (write-only)
 *   POST /api/settings/mcp/1c/test        → { ok, error? }
 */

export interface WorkspaceInfo {
  name: string;
  key_fingerprint: string;
  created_at: string;
}

export interface BitrixStatus {
  portal_url: string | null;
  has_token: boolean;
}

export interface BitrixCreds {
  portal_url: string;
  webhook_token: string;
}

export interface OneCStatus {
  odata_url: string | null;
  username: string | null;
  has_password: boolean;
}

export interface OneCCreds {
  odata_url: string;
  username: string;
  password: string;
}

export interface TestResult {
  ok: boolean;
  error?: string;
}

const BASE = "/api/settings";

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

export async function fetchWorkspace(): Promise<WorkspaceInfo> {
  const res = await fetch(`${BASE}/workspace`);
  return jsonOrThrow<WorkspaceInfo>(res, "workspace");
}

export async function downloadBackup(): Promise<Blob> {
  const res = await fetch(`${BASE}/workspace/backup`, { method: "POST" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`backup failed: ${res.status} ${body.slice(0, 200)}`);
  }
  return res.blob();
}

export async function fetchBitrixStatus(): Promise<BitrixStatus> {
  const res = await fetch(`${BASE}/mcp/bitrix24`);
  return jsonOrThrow<BitrixStatus>(res, "bitrix24 status");
}

export async function saveBitrixCreds(input: BitrixCreds): Promise<void> {
  const res = await fetch(`${BASE}/mcp/bitrix24`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  await okOrThrow(res, "bitrix24 save");
}

export async function testBitrix(): Promise<TestResult> {
  const res = await fetch(`${BASE}/mcp/bitrix24/test`, { method: "POST" });
  if (!res.ok) {
    return { ok: false, error: `${res.status}` };
  }
  return res.json() as Promise<TestResult>;
}

export async function fetchOneCStatus(): Promise<OneCStatus> {
  const res = await fetch(`${BASE}/mcp/1c`);
  return jsonOrThrow<OneCStatus>(res, "1c status");
}

export async function saveOneCCreds(input: OneCCreds): Promise<void> {
  const res = await fetch(`${BASE}/mcp/1c`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  await okOrThrow(res, "1c save");
}

export async function testOneC(): Promise<TestResult> {
  const res = await fetch(`${BASE}/mcp/1c/test`, { method: "POST" });
  if (!res.ok) {
    return { ok: false, error: `${res.status}` };
  }
  return res.json() as Promise<TestResult>;
}
