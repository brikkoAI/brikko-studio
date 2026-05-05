export class Bitrix24Error extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class CredentialsMissingError extends Bitrix24Error {
  constructor() {
    super(
      "Bitrix24 credentials not found in keychain. Configure them in Settings → MCP.",
    );
  }
}

export class RateLimitedError extends Bitrix24Error {
  constructor(public readonly retryAfterSec: number) {
    super(`Bitrix24 rate limit hit. Retry after ${retryAfterSec}s.`);
  }
}

export class AuthExpiredError extends Bitrix24Error {
  constructor() {
    super(
      "Bitrix24 webhook token rejected (HTTP 401). Token may be revoked or rotated.",
    );
  }
}
