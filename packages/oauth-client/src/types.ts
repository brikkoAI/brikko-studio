export interface TokenSet {
  access_token: string;
  refresh_token: string;
  expires_at: number; // unix epoch seconds
  token_type: "Bearer";
  scope: string;
  // Optional: Gateway's standard token response per RFC 6749 §5.1 does not
  // include user_email. We may populate it later via a /userinfo endpoint
  // or as a Gateway extension. Clients must not assume it is present.
  user_email?: string;
}

export interface KeychainBackend {
  set(account: string, value: string): Promise<void>;
  get(account: string): Promise<string | null>;
  delete(account: string): Promise<boolean>;
}
