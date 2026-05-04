/**
 * Error hierarchy for @brikko/privacy-plugin.
 *
 * Callers in the hook layer should distinguish between:
 *   - AnonymizerUnavailableError: sidecar is offline / DNS fails / TCP refused.
 *     The hook decides degraded-mode behaviour per workspace policy profile.
 *   - AnonymizerRequestError: sidecar returned 4xx/5xx with a body. Surfaces the
 *     status + body so the caller can branch on `error: "trust_violation"` etc.
 *   - TrustViolationError: a typed convenience for the most common 403 case
 *     (a tool was denied by policy).
 *   - StreamProtocolError: the NDJSON restore stream returned a malformed frame.
 */

export class BrikkoPluginError extends Error {
  public override readonly cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.cause = cause;
  }
}

export class AnonymizerUnavailableError extends BrikkoPluginError {
  public readonly url: string;
  constructor(url: string, cause?: unknown) {
    super(`Anonymizer sidecar is unavailable at ${url}`, cause);
    this.url = url;
  }
}

export class AnonymizerRequestError extends BrikkoPluginError {
  public readonly status: number;
  public readonly body: string;
  constructor(status: number, body: string) {
    super(`Anonymizer responded HTTP ${status}: ${body.slice(0, 200)}`);
    this.status = status;
    this.body = body;
  }
}

export class TrustViolationError extends BrikkoPluginError {
  public readonly tool: string;
  public readonly reason: string;
  constructor(tool: string, reason: string) {
    super(`Tool '${tool}' denied by policy: ${reason}`);
    this.tool = tool;
    this.reason = reason;
  }
}

export class StreamProtocolError extends BrikkoPluginError {
  constructor(reason: string) {
    super(`Anonymizer stream protocol violation: ${reason}`);
  }
}
