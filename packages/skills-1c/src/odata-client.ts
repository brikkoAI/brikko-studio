import { OneCAuthError, OneCError, OneCNotFoundError } from "./errors.js";
import type { OneCCredentials } from "./credentials.js";

export interface OdataOptions {
  requestTimeoutMs: number;
}

const DEFAULT_OPTIONS: OdataOptions = { requestTimeoutMs: 8000 };

/**
 * 1С OData REST client.
 *
 * Endpoint pattern: GET/POST {odataUrl}/{EntitySet}?$format=json&...
 * Auth: HTTP Basic. Most reads use GET; element writes use POST.
 *
 * Transport: native `fetch` (Node 22 built-in). MSW can intercept fetch
 * in tests; using undici's `request()` directly would require @mswjs/interceptors
 * undici hook in setup.
 *
 * Configurations supported in M2: 1С:Бухгалтерия 3.0. УНФ/УТ deferred to M3.
 */
export class OdataClient {
  private readonly opts: OdataOptions;

  constructor(
    private readonly creds: OneCCredentials,
    opts: Partial<OdataOptions> = {},
  ) {
    this.opts = { ...DEFAULT_OPTIONS, ...opts };
  }

  async get<T>(
    entitySet: string,
    query: Record<string, string> = {},
  ): Promise<T> {
    const base = this.creds.odataUrl.replace(/\/$/, "");
    // Build query string manually so we don't double-encode the entitySet
    // (1С entity sets contain Cyrillic, which the URL constructor percent-encodes
    // and MSW path matching then sees a different string than the registered route).
    const params = new URLSearchParams({ $format: "json" });
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== "") params.set(k, v);
    }
    const fullUrl = `${base}/${entitySet}?${params.toString()}`;
    return this.fetchJson<T>(
      fullUrl,
      {
        method: "GET",
        headers: this.headers(),
      },
      entitySet,
    );
  }

  async post<T>(entitySet: string, body: unknown): Promise<T> {
    const base = this.creds.odataUrl.replace(/\/$/, "");
    const url = `${base}/${entitySet}?$format=json`;
    return this.fetchJson<T>(
      url,
      {
        method: "POST",
        headers: { ...this.headers(), "content-type": "application/json" },
        body: JSON.stringify(body),
      },
      entitySet,
    );
  }

  private headers(): Record<string, string> {
    const auth =
      "Basic " +
      Buffer.from(`${this.creds.username}:${this.creds.password}`).toString(
        "base64",
      );
    return { authorization: auth, accept: "application/json" };
  }

  private async fetchJson<T>(
    url: string,
    init: RequestInit,
    entitySet: string,
  ): Promise<T> {
    let res: Response;
    try {
      res = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(this.opts.requestTimeoutMs),
      });
    } catch (err) {
      throw new OneCError(`network failure for ${entitySet}`, err);
    }
    const text = await res.text();
    if (res.status === 401) throw new OneCAuthError();
    if (res.status === 404) throw new OneCNotFoundError(entitySet);
    if (res.status >= 400) {
      throw new OneCError(`HTTP ${res.status}: ${text.slice(0, 200)}`);
    }
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new OneCError(
        `1С returned non-JSON for ${entitySet}: ${text.slice(0, 100)}`,
      );
    }
  }
}
