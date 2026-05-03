import Fastify, { type FastifyInstance } from "fastify";
import { OAuthClient, type TokenStore } from "@brikko/oauth-client";

/**
 * Configuration for the embedded HTTP bridge that the Studio web-ui calls
 * into. The bridge owns:
 *   - PKCE state for in-flight authorize/exchange flows (in-memory map),
 *   - the persistent {@link TokenStore} that wraps the keychain,
 *   - and a single {@link OAuthClient} pointing at the Brikko Gateway.
 *
 * NOTE: The Gateway's standard /v1/oauth/token response (RFC 6749 §5.1) does
 * NOT include `user_email`. Tests stub it in for assertion convenience, and a
 * future /userinfo endpoint may surface it. Until then, production callers
 * must treat `tokens.user_email` as `undefined` and the web-ui shows a blank
 * email gracefully.
 */
export interface AuthApiConfig {
  tokenStore: TokenStore;
  gatewayBase: string;
  clientId: string;
  redirectUri: string;
  scope: string;
}

interface PendingAuth {
  verifier: string;
  state: string;
  createdAt: number;
}

const PENDING_AUTH_TTL_MS = 10 * 60 * 1000;

export async function buildAuthApi(cfg: AuthApiConfig): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  const client = new OAuthClient({
    gatewayBase: cfg.gatewayBase,
    clientId: cfg.clientId,
    redirectUri: cfg.redirectUri,
    scope: cfg.scope,
  });
  const pending = new Map<string, PendingAuth>();

  const sweepExpired = (now: number): void => {
    for (const [key, entry] of pending) {
      if (now - entry.createdAt > PENDING_AUTH_TTL_MS) {
        pending.delete(key);
      }
    }
  };

  app.post("/api/auth/start", async () => {
    const { url, verifier, state } = client.buildAuthorizeUrl();
    const now = Date.now();
    pending.set(state, { verifier, state, createdAt: now });
    sweepExpired(now);
    return { authorize_url: url };
  });

  app.post<{ Body: { code?: string; state?: string } }>(
    "/api/auth/complete",
    async (req, reply) => {
      const { code, state } = req.body ?? {};
      if (!code || !state) {
        return reply.code(400).send({ error: "missing code or state" });
      }
      const entry = pending.get(state);
      if (!entry) {
        return reply
          .code(400)
          .send({ error: "unknown state (expired or never issued)" });
      }
      pending.delete(state);
      try {
        const tokens = await client.exchangeCode(code, entry.verifier);
        await cfg.tokenStore.save(tokens);
        return { logged_in: true, user_email: tokens.user_email };
      } catch (e) {
        return reply
          .code(400)
          .send({ error: e instanceof Error ? e.message : String(e) });
      }
    },
  );

  app.get("/api/auth/status", async () => {
    const tokens = await cfg.tokenStore.load();
    if (!tokens) return { logged_in: false };
    return { logged_in: true, user_email: tokens.user_email };
  });

  app.post("/api/auth/logout", async () => {
    await cfg.tokenStore.clear();
    return { logged_in: false };
  });

  return app;
}
