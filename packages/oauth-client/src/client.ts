import { randomBytes } from "node:crypto";
import { generatePkcePair } from "./pkce.js";
import type { TokenSet } from "./types.js";

export interface OAuthConfig {
  /** Base URL of the Brikko Gateway, e.g. https://api.brikko.ru (no trailing slash). */
  gatewayBase: string;
  /** OAuth client_id registered with the Gateway. */
  clientId: string;
  /** OAuth redirect_uri (must match what's registered server-side). */
  redirectUri: string;
  /** Space-separated scopes, e.g. "chat.read messages.read". */
  scope: string;
}

export interface AuthorizeUrl {
  /** Fully-built /v1/oauth/authorize URL the user should visit. */
  url: string;
  /** PKCE verifier — keep this secret; pass it to exchangeCode() later. */
  verifier: string;
  /** Random opaque CSRF state — verify it matches in the callback. */
  state: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: "Bearer";
  scope: string;
  // Optional: Gateway's standard response does not include this; some test
  // mocks / future /userinfo wiring may surface it. Treat as nullable.
  user_email?: string;
}

interface OAuthErrorBody {
  error: string;
  error_description?: string;
}

/**
 * OAuth 2.0 Authorization Code + PKCE client for the Brikko Gateway.
 *
 * - buildAuthorizeUrl(): generate the URL to send the user to, plus the PKCE
 *   verifier and CSRF state to remember.
 * - exchangeCode(): swap an authorization code (returned to redirect_uri)
 *   plus the verifier for an access/refresh token pair.
 * - refresh(): use a refresh token to get a new access token.
 *
 * Gateway's /v1/oauth/token expects application/x-www-form-urlencoded bodies
 * (FastAPI Form() params, per RFC 6749). We build them with URLSearchParams.
 */
export class OAuthClient {
  constructor(private readonly config: OAuthConfig) {}

  buildAuthorizeUrl(): AuthorizeUrl {
    const pair = generatePkcePair();
    const state = randomBytes(16).toString("hex");
    const url = new URL(`${this.config.gatewayBase}/v1/oauth/authorize`);
    url.searchParams.set("client_id", this.config.clientId);
    url.searchParams.set("redirect_uri", this.config.redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", this.config.scope);
    url.searchParams.set("code_challenge", pair.challenge);
    url.searchParams.set("code_challenge_method", pair.method);
    url.searchParams.set("state", state);
    return { url: url.toString(), verifier: pair.verifier, state };
  }

  async exchangeCode(code: string, codeVerifier: string): Promise<TokenSet> {
    return this.requestTokens({
      grant_type: "authorization_code",
      code,
      code_verifier: codeVerifier,
      redirect_uri: this.config.redirectUri,
      client_id: this.config.clientId,
    });
  }

  async refresh(refreshToken: string): Promise<TokenSet> {
    return this.requestTokens({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: this.config.clientId,
    });
  }

  private async requestTokens(body: Record<string, string>): Promise<TokenSet> {
    const formBody = new URLSearchParams(body).toString();
    const resp = await fetch(`${this.config.gatewayBase}/v1/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formBody,
    });

    const data = (await resp.json()) as TokenResponse | OAuthErrorBody;

    if (!resp.ok) {
      const err = data as OAuthErrorBody;
      throw new Error(`OAuth ${err.error}: ${err.error_description ?? "unknown"}`);
    }

    const tr = data as TokenResponse;
    const tokens: TokenSet = {
      access_token: tr.access_token,
      refresh_token: tr.refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + tr.expires_in,
      token_type: tr.token_type,
      scope: tr.scope,
    };
    if (tr.user_email !== undefined) {
      tokens.user_email = tr.user_email;
    }
    return tokens;
  }
}
