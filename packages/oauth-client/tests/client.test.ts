import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { setupServer } from "msw/node";
import { handlers, GATEWAY_BASE } from "./__mocks__/gateway-handlers.js";
import { OAuthClient } from "../src/client.js";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("OAuthClient", () => {
  const client = new OAuthClient({
    gatewayBase: GATEWAY_BASE,
    clientId: "studio",
    redirectUri: "http://localhost:3737/callback",
    scope: "chat.read messages.read embeddings.read audio.read",
  });

  it("builds an authorization URL with PKCE challenge and state", () => {
    const { url, verifier, state } = client.buildAuthorizeUrl();
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe(`${GATEWAY_BASE}/v1/oauth/authorize`);
    expect(parsed.searchParams.get("client_id")).toBe("studio");
    expect(parsed.searchParams.get("redirect_uri")).toBe("http://localhost:3737/callback");
    expect(parsed.searchParams.get("response_type")).toBe("code");
    expect(parsed.searchParams.get("scope")).toBe(
      "chat.read messages.read embeddings.read audio.read"
    );
    expect(parsed.searchParams.get("code_challenge_method")).toBe("S256");
    expect(parsed.searchParams.get("code_challenge")).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(parsed.searchParams.get("state")).toBe(state);
    expect(verifier).toMatch(/^[A-Za-z0-9_-]{43,128}$/);
  });

  it("exchanges a valid code for tokens", async () => {
    const tokens = await client.exchangeCode("valid_code", "verifier_xyz");
    expect(tokens.access_token).toBe("atk_test_12345");
    expect(tokens.refresh_token).toBe("rtk_test_67890");
    expect(tokens.user_email).toBe("test@brikko.ru");
    expect(tokens.expires_at).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it("rejects an invalid code", async () => {
    await expect(client.exchangeCode("bad_code", "verifier_xyz")).rejects.toThrow(
      /invalid_grant/
    );
  });

  it("refreshes a valid refresh token", async () => {
    const tokens = await client.refresh("rtk_test_67890");
    expect(tokens.access_token).toBe("atk_test_refreshed");
  });

  it("rejects an expired refresh token", async () => {
    await expect(client.refresh("rtk_expired")).rejects.toThrow(/invalid_grant/);
  });
});
