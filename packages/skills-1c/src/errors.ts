export class OneCError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class OneCCredentialsMissingError extends OneCError {
  constructor() {
    super(
      "1С credentials not found in keychain. Configure them in Settings → MCP.",
    );
  }
}

export class OneCAuthError extends OneCError {
  constructor() {
    super(
      "1С rejected credentials (HTTP 401). Update user/password in Settings.",
    );
  }
}

export class OneCNotFoundError extends OneCError {
  constructor(public readonly path: string) {
    super(`1С: not found at ${path}`);
  }
}
