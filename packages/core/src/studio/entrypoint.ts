import path from "node:path";
import { fileURLToPath } from "node:url";
import fastifyStatic from "@fastify/static";
import { buildAuthApi } from "../auth-api/server.js";
import { TokenStore, defaultBackend } from "@brikko/oauth-client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
void __dirname; // reserved for future relative paths (e.g. bundled assets)

export interface StudioConfig {
  port: number;
  gatewayBase: string;
  webUiDist: string;
}

/**
 * Boot the embedded Studio HTTP server:
 *   - Mount {@link buildAuthApi} for /api/auth/* endpoints.
 *   - Serve the built React web-ui from `webUiDist` at /.
 *   - SPA fallback: any non-/api GET that misses static returns index.html so
 *     React Router can handle the route client-side.
 *
 * The server binds to 0.0.0.0 so it can be reached from a browser on the
 * same machine (and, in the future, from LAN devices when desired).
 */
export async function runStudio(cfg: StudioConfig): Promise<void> {
  const tokenStore = new TokenStore(defaultBackend());
  const app = await buildAuthApi({
    tokenStore,
    gatewayBase: cfg.gatewayBase,
    clientId: "studio",
    redirectUri: `http://localhost:${cfg.port}/callback`,
    scope: "chat.read messages.read embeddings.read audio.read",
  });

  await app.register(fastifyStatic, { root: cfg.webUiDist, prefix: "/" });

  app.setNotFoundHandler((req, reply) => {
    if (req.method === "GET" && !req.url.startsWith("/api/")) {
      return reply.sendFile("index.html");
    }
    reply.code(404).send({ error: "not found" });
  });

  await app.listen({ port: cfg.port, host: "0.0.0.0" });
  console.warn(`[brikko-studio] listening on http://localhost:${cfg.port}`);
}
