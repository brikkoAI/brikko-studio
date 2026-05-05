/**
 * REST client for onboarding wizard endpoints.
 *
 * Server-side handlers (`/api/onboarding/*`) live in `bin/brikko.js` and proxy
 * to the anonymizer (workspace creation) + auth-api (provider linking) +
 * local config files (disclaimer ack, finalize). They are NOT yet implemented
 * in M1 / M0 — see `docs/M2_FOLLOWUPS.md` "onboarding API gap" entry.
 *
 * Endpoints:
 *   POST /api/onboarding/create-workspace   → { id, name, key_fingerprint }
 *   GET  /api/onboarding/workspace/backup   → encrypted blob (Content-Disposition)
 *   POST /api/onboarding/llm-provider       → 204
 *   POST /api/onboarding/disclaimer/ack     → 204
 *   POST /api/onboarding/finalize           → 204
 *
 * No auth header — core's auth-api session cookie is reused on the same origin.
 */

export interface CreateWorkspaceInput {
  name: string;
}

export interface CreateWorkspaceResp {
  id: string;
  name: string;
  key_fingerprint: string;
}

export type LlmProviderChoice =
  | { kind: "brikko" }
  | {
      kind: "byo";
      provider: "anthropic" | "openai" | "yandex" | "gigachat";
      api_key: string;
    };

const BASE = "/api/onboarding";

/**
 * Validate workspace name client-side: alphanumeric + underscore + hyphen,
 * 1..64 chars. Returns null if valid, else a human-readable error.
 *
 * Mirrors the server's slug validator (anonymizer M1 §workspace.create).
 */
const NAME_RE = /^[A-Za-z0-9_-]{1,64}$/;
export function validateWorkspaceName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length === 0) return "Введите название";
  if (trimmed.length > 64) return "Не больше 64 символов";
  if (!NAME_RE.test(trimmed)) {
    return "Только буквы, цифры, _ и -";
  }
  return null;
}

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

export async function createWorkspace(
  input: CreateWorkspaceInput,
): Promise<CreateWorkspaceResp> {
  const res = await fetch(`${BASE}/create-workspace`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  return jsonOrThrow<CreateWorkspaceResp>(res, "create-workspace");
}

export async function downloadWorkspaceBackup(): Promise<Blob> {
  const res = await fetch(`${BASE}/workspace/backup`, { method: "POST" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`workspace-backup failed: ${res.status} ${body.slice(0, 200)}`);
  }
  return res.blob();
}

export async function saveLlmProvider(p: LlmProviderChoice): Promise<void> {
  const res = await fetch(`${BASE}/llm-provider`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(p),
  });
  await okOrThrow(res, "llm-provider");
}

export async function ackDisclaimer(): Promise<void> {
  const res = await fetch(`${BASE}/disclaimer/ack`, { method: "POST" });
  await okOrThrow(res, "disclaimer-ack");
}

export async function finalizeOnboarding(): Promise<void> {
  const res = await fetch(`${BASE}/finalize`, { method: "POST" });
  await okOrThrow(res, "finalize");
}
