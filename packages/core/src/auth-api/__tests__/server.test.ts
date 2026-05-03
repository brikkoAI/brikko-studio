import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { buildAuthApi } from "../server.js";
import { InMemoryKeychain, TokenStore } from "@brikko/oauth-client";

const GATEWAY = "https://api.brikko.ru";

const mock = setupServer(
  http.post(`${GATEWAY}/v1/oauth/token`, () =>
    HttpResponse.json({
      access_token: "atk",
      refresh_token: "rtk",
      expires_in: 3600,
      token_type: "Bearer",
      scope: "chat.read messages.read embeddings.read audio.read",
      user_email: "user@brikko.ru",
    }),
  ),
);

describe("Auth HTTP API", () => {
  let app: Awaited<ReturnType<typeof buildAuthApi>>;
  let store: TokenStore;

  beforeEach(async () => {
    mock.listen({ onUnhandledRequest: "error" });
    store = new TokenStore(new InMemoryKeychain());
    app = await buildAuthApi({
      tokenStore: store,
      gatewayBase: GATEWAY,
      clientId: "studio",
      redirectUri: "http://localhost:3737/callback",
      scope: "chat.read messages.read embeddings.read audio.read",
    });
  });

  afterEach(async () => {
    await app.close();
    mock.close();
  });

  it("POST /api/auth/start returns an authorize URL", async () => {
    const resp = await app.inject({ method: "POST", url: "/api/auth/start" });
    expect(resp.statusCode).toBe(200);
    const body = resp.json() as { authorize_url: string };
    expect(body.authorize_url).toContain(`${GATEWAY}/v1/oauth/authorize`);
    expect(body.authorize_url).toContain("code_challenge=");
  });

  it("POST /api/auth/complete exchanges code and persists token", async () => {
    const startResp = await app.inject({ method: "POST", url: "/api/auth/start" });
    const url = new URL((startResp.json() as { authorize_url: string }).authorize_url);
    const state = url.searchParams.get("state")!;
    const resp = await app.inject({
      method: "POST",
      url: "/api/auth/complete",
      payload: { code: "valid", state },
    });
    expect(resp.statusCode).toBe(200);
    expect(resp.json()).toEqual({ logged_in: true, user_email: "user@brikko.ru" });
    const stored = await store.load();
    expect(stored?.access_token).toBe("atk");
  });

  it("POST /api/auth/complete rejects unknown state", async () => {
    const resp = await app.inject({
      method: "POST",
      url: "/api/auth/complete",
      payload: { code: "valid", state: "never-issued" },
    });
    expect(resp.statusCode).toBe(400);
    expect(resp.json()).toMatchObject({ error: expect.stringContaining("state") });
  });

  it("GET /api/auth/status reflects stored token", async () => {
    const before = await app.inject({ method: "GET", url: "/api/auth/status" });
    expect(before.json()).toEqual({ logged_in: false });
    await store.save({
      access_token: "atk",
      refresh_token: "rtk",
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: "Bearer",
      scope: "chat.read",
      user_email: "x@y.z",
    });
    const after = await app.inject({ method: "GET", url: "/api/auth/status" });
    expect(after.json()).toEqual({ logged_in: true, user_email: "x@y.z" });
  });

  it("POST /api/auth/logout clears the token", async () => {
    await store.save({
      access_token: "atk",
      refresh_token: "rtk",
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: "Bearer",
      scope: "x",
      user_email: "u@v.w",
    });
    const resp = await app.inject({ method: "POST", url: "/api/auth/logout" });
    expect(resp.statusCode).toBe(200);
    expect(await store.load()).toBeNull();
  });
});
