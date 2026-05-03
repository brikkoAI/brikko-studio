import { createServer, type Server } from "node:http";
import { AddressInfo } from "node:net";

export interface CallbackOptions {
  port: number;
  expectedState: string;
}
export interface CallbackResult { code: string; state: string; }
export interface CallbackHandle {
  port: number;
  waitForCallback(): Promise<CallbackResult>;
  close(): Promise<void>;
}

const SUCCESS_HTML = `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><title>Brikko Studio</title>
<style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f7f5f0}
.card{padding:2rem;border-radius:12px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.08);text-align:center}</style>
</head><body><div class="card"><h1>Brikko Studio</h1><p>Вход выполнен. Можно закрыть это окно.</p></div></body></html>`;

const ERROR_HTML = `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><title>Brikko Studio</title></head>
<body><h1>Ошибка входа</h1><p>Вернитесь в Brikko Studio и попробуйте снова.</p></body></html>`;

export async function startCallbackServer(opts: CallbackOptions): Promise<CallbackHandle> {
  let resolve!: (r: CallbackResult) => void;
  let reject!: (e: Error) => void;
  const promise = new Promise<CallbackResult>((res, rej) => { resolve = res; reject = rej; });

  const server: Server = createServer((req, res) => {
    if (!req.url || !req.url.startsWith("/callback")) { res.writeHead(404).end(); return; }
    const url = new URL(req.url, `http://127.0.0.1:${opts.port}`);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code) {
      res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" }).end(ERROR_HTML);
      reject(new Error("missing code in callback")); return;
    }
    if (state !== opts.expectedState) {
      res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" }).end(ERROR_HTML);
      reject(new Error("state mismatch")); return;
    }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(SUCCESS_HTML);
    resolve({ code, state });
  });

  await new Promise<void>((res) => server.listen(opts.port, "127.0.0.1", res));
  const actualPort = (server.address() as AddressInfo).port;

  return {
    port: actualPort,
    waitForCallback: () => promise,
    close: () => new Promise<void>((res, rej) => server.close((err) => (err ? rej(err) : res()))),
  };
}
