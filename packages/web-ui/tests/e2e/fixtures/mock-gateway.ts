import { createServer, type Server } from "node:http";
import { URL } from "node:url";

export function startMockGateway(
  port: number
): Promise<{ server: Server; close: () => Promise<void> }> {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url!, `http://127.0.0.1:${port}`);

      if (url.pathname === "/v1/oauth/authorize" && req.method === "GET") {
        const redirectUri = url.searchParams.get("redirect_uri")!;
        const state = url.searchParams.get("state")!;
        const callback = new URL(redirectUri);
        callback.searchParams.set("code", "e2e_valid_code");
        callback.searchParams.set("state", state);
        res.writeHead(302, { Location: callback.toString() }).end();
        return;
      }

      if (url.pathname === "/v1/oauth/token" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", () => {
          res
            .writeHead(200, { "Content-Type": "application/json" })
            .end(
              JSON.stringify({
                access_token: "e2e_atk",
                refresh_token: "e2e_rtk",
                expires_in: 3600,
                token_type: "Bearer",
                scope: "chat.read messages.read embeddings.read audio.read",
                user_email: "e2e@brikko.ru",
              })
            );
        });
        return;
      }

      res.writeHead(404).end();
    });

    server.listen(port, "127.0.0.1", () =>
      resolve({
        server,
        close: () =>
          new Promise<void>((res) => server.close(() => res())),
      })
    );
  });
}
