import type { PluginConfig } from "./config.js";
import {
  AnonymizerRequestError,
  AnonymizerUnavailableError,
} from "./errors.js";
import type {
  AnonymizeRequest,
  AnonymizeResponse,
  AuditQueryParams,
  AuditQueryResponse,
  BackupResponse,
  PurgeRequest,
  PurgeResponse,
  RestoreRequest,
  RestoreResponse,
  StatsResponse,
  ToolCallDeanonRequest,
  ToolCallDeanonResponse,
} from "./anonymizer-types.js";

/**
 * Typed HTTP client for the local Brikko Anonymizer sidecar.
 *
 * Transport: native `fetch` (Node 22 built-in, undici-backed). We use
 * `AbortSignal.timeout()` for per-request deadline. The fetch path is
 * MSW-interceptable for unit tests; switching to undici's `request()`
 * directly would require the @mswjs/interceptors undici hook in setup.
 *
 * Error mapping:
 *   - Network errors / aborts → `AnonymizerUnavailableError` (cause preserved).
 *   - HTTP 4xx → `AnonymizerRequestError` (no retry; caller branches on body).
 *   - HTTP 5xx and network errors → exponential-backoff retry up to
 *     `cfg.maxRetries` attempts. Final failure → AnonymizerRequestError or
 *     AnonymizerUnavailableError respectively.
 *
 * The class itself has no Anonymizer-specific business logic — it is the
 * thin transport layer. Per-hook decisions (degraded-mode policy, audit
 * writes, etc.) live in the hook implementations (Tasks 4-10).
 */
export class AnonymizerClient {
  private readonly cfg: PluginConfig;

  constructor(cfg: PluginConfig) {
    this.cfg = cfg;
  }

  // -- public methods, one per anonymizer endpoint --------------------

  async anonymize(req: AnonymizeRequest): Promise<AnonymizeResponse> {
    return this.postJson<AnonymizeResponse>("/anonymize", req);
  }

  async restore(req: RestoreRequest): Promise<RestoreResponse> {
    return this.postJson<RestoreResponse>("/restore", req);
  }

  async toolCallDeanonymize(
    req: ToolCallDeanonRequest,
  ): Promise<ToolCallDeanonResponse> {
    return this.postJson<ToolCallDeanonResponse>(
      "/tool_call/deanonymize",
      req,
    );
  }

  async getStats(workspaceId: string): Promise<StatsResponse> {
    return this.getJson<StatsResponse>(
      `/workspaces/${encodeURIComponent(workspaceId)}/stats`,
    );
  }

  async listAudit(
    workspaceId: string,
    opts: AuditQueryParams = { limit: 100, offset: 0 },
  ): Promise<AuditQueryResponse> {
    const params = new URLSearchParams();
    params.set("limit", String(opts.limit));
    params.set("offset", String(opts.offset));
    if (opts.category) params.set("category", opts.category);
    if (opts.since) params.set("since", opts.since);
    const path =
      `/workspaces/${encodeURIComponent(workspaceId)}/audit?` + params.toString();
    return this.getJson<AuditQueryResponse>(path);
  }

  async purge(
    workspaceId: string,
    body: PurgeRequest,
  ): Promise<PurgeResponse> {
    return this.postJson<PurgeResponse>(
      `/workspaces/${encodeURIComponent(workspaceId)}/purge`,
      body,
    );
  }

  /**
   * Fetch the encrypted backup blob for a workspace.
   * Returns raw bytes — the caller is responsible for persisting / decrypting.
   */
  async backup(workspaceId: string): Promise<BackupResponse> {
    const url =
      this.cfg.anonymizerUrl +
      `/workspaces/${encodeURIComponent(workspaceId)}/backup`;
    return this.withRetry(async () => {
      const res = await this.fetchWithTimeout(url, { method: "POST" });
      if (res.status >= 400) {
        const body = await res.text();
        throw new AnonymizerRequestError(res.status, body);
      }
      const buf = await res.arrayBuffer();
      return new Uint8Array(buf);
    });
  }

  // -- private transport helpers --------------------------------------

  private async postJson<T>(path: string, body: unknown): Promise<T> {
    const url = this.cfg.anonymizerUrl + path;
    return this.withRetry(async () => {
      const res = await this.fetchWithTimeout(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      if (res.status >= 400) {
        throw new AnonymizerRequestError(res.status, text);
      }
      return JSON.parse(text) as T;
    });
  }

  private async getJson<T>(path: string): Promise<T> {
    const url = this.cfg.anonymizerUrl + path;
    return this.withRetry(async () => {
      const res = await this.fetchWithTimeout(url, { method: "GET" });
      const text = await res.text();
      if (res.status >= 400) {
        throw new AnonymizerRequestError(res.status, text);
      }
      return JSON.parse(text) as T;
    });
  }

  /**
   * Native fetch with a per-request timeout via AbortSignal.
   * Maps network/abort errors to AnonymizerUnavailableError so the retry
   * loop and the caller can both branch cleanly.
   */
  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
  ): Promise<Response> {
    try {
      return await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(this.cfg.requestTimeoutMs),
      });
    } catch (err) {
      throw new AnonymizerUnavailableError(url, err);
    }
  }

  /**
   * Retry loop with exponential backoff for transient failures.
   *   - AnonymizerUnavailableError (network/timeout): retried.
   *   - AnonymizerRequestError with status >= 500: retried.
   *   - AnonymizerRequestError with status < 500: returned to caller (no retry).
   *   - Any other thrown value: re-thrown unchanged (no retry).
   */
  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastErr: unknown;
    for (let attempt = 1; attempt <= this.cfg.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastErr = err;
        const isTransient =
          err instanceof AnonymizerUnavailableError ||
          (err instanceof AnonymizerRequestError && err.status >= 500);
        if (!isTransient || attempt === this.cfg.maxRetries) {
          throw err;
        }
        const delay = this.cfg.retryBaseDelayMs * Math.pow(2, attempt - 1);
        await sleep(delay);
      }
    }
    // Unreachable — the loop either returns or throws.
    throw lastErr;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
