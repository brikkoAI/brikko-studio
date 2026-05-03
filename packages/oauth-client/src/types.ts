export interface TokenSet {
  access_token: string;
  refresh_token: string;
  expires_at: number; // unix epoch seconds
  token_type: "Bearer";
  scope: string;
  user_email: string;
}

export interface KeychainBackend {
  set(account: string, value: string): Promise<void>;
  get(account: string): Promise<string | null>;
  delete(account: string): Promise<boolean>;
}
