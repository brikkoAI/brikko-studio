import {
  AuthExpiredError,
  Bitrix24Error,
  RateLimitedError,
} from "./errors.js";
import type { Bitrix24Credentials } from "./credentials.js";

export interface CrestOptions {
  requestTimeoutMs: number;
  maxRetries: number;
}

const DEFAULT_OPTIONS: CrestOptions = {
  requestTimeoutMs: 8000,
  maxRetries: 2,
};

/**
 * Thin wrapper over Bitrix24's REST/Webhook HTTP API.
 *
 * Endpoint pattern: POST {portalUrl}/rest/{webhookToken}/{method}.json
 * Body: JSON. Response: { result: T, total?, time? } or { error, error_description }.
 *
 * Transport: native `fetch` (Node 22 built-in, undici-backed). MSW can intercept
 * fetch directly; calling undici's `request()` would require the @mswjs/interceptors
 * undici hook in test setup, which we avoid.
 *
 * Retries network failures and 5xx with exponential backoff. Does NOT retry 4xx
 * (except 429, which throws RateLimitedError so the caller can decide to wait).
 */
export class CrestClient {
  private readonly opts: CrestOptions;

  constructor(
    private readonly creds: Bitrix24Credentials,
    opts: Partial<CrestOptions> = {},
  ) {
    this.opts = { ...DEFAULT_OPTIONS, ...opts };
  }

  async call<T>(method: string, payload: Record<string, unknown>): Promise<T> {
    const base = this.creds.portalUrl.replace(/\/$/, "");
    const url = `${base}/rest/${this.creds.webhookToken}/${method}.json`;
    let attempt = 0;
    while (true) {
      let res: Response;
      try {
        res = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(this.opts.requestTimeoutMs),
        });
      } catch (err) {
        if (attempt < this.opts.maxRetries) {
          attempt++;
          await sleep(200 * 2 ** attempt);
          continue;
        }
        throw new Bitrix24Error(`network failure calling ${method}`, err);
      }

      const text = await res.text();

      if (res.status === 401) throw new AuthExpiredError();
      if (res.status === 429) {
        const retryHeader = res.headers.get("retry-after");
        const retry = Number(retryHeader ?? "30");
        throw new RateLimitedError(Number.isFinite(retry) ? retry : 30);
      }
      if (res.status >= 500 && attempt < this.opts.maxRetries) {
        attempt++;
        await sleep(200 * 2 ** attempt);
        continue;
      }
      if (res.status >= 400) {
        throw new Bitrix24Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      }

      let parsed: { result: T; error?: string; error_description?: string };
      try {
        parsed = JSON.parse(text) as typeof parsed;
      } catch {
        throw new Bitrix24Error(
          `Bitrix24 returned non-JSON response for ${method}: ${text.slice(0, 100)}`,
        );
      }
      if (parsed.error) {
        throw new Bitrix24Error(
          `Bitrix24 error: ${parsed.error}${parsed.error_description ? ` — ${parsed.error_description}` : ""}`,
        );
      }
      return parsed.result;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
