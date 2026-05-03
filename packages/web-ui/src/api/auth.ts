export interface AuthStatus { logged_in: boolean; user_email?: string; }
const AUTH_API = "/api/auth";

export async function startLogin(): Promise<{ authorize_url: string }> {
  const resp = await fetch(`${AUTH_API}/start`, { method: "POST" });
  if (!resp.ok) throw new Error(`startLogin failed: ${resp.status}`);
  return resp.json() as Promise<{ authorize_url: string }>;
}

export async function completeLogin(code: string, state: string): Promise<AuthStatus> {
  const resp = await fetch(`${AUTH_API}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, state }),
  });
  if (!resp.ok) {
    const err = (await resp.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `completeLogin failed: ${resp.status}`);
  }
  return resp.json() as Promise<AuthStatus>;
}

export async function getStatus(): Promise<AuthStatus> {
  const resp = await fetch(`${AUTH_API}/status`);
  if (!resp.ok) return { logged_in: false };
  return resp.json() as Promise<AuthStatus>;
}

export async function logout(): Promise<void> {
  await fetch(`${AUTH_API}/logout`, { method: "POST" });
}
