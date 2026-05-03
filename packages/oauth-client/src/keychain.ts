import type { KeychainBackend, TokenSet } from "./types.js";

const SERVICE = "brikko-studio";
const ACCOUNT = "tokens";
const FULL_KEY = `${SERVICE}:${ACCOUNT}`;

export class InMemoryKeychain implements KeychainBackend {
  private store = new Map<string, string>();

  async set(account: string, value: string): Promise<void> {
    this.store.set(account, value);
  }

  async get(account: string): Promise<string | null> {
    return this.store.get(account) ?? null;
  }

  async delete(account: string): Promise<boolean> {
    return this.store.delete(account);
  }
}

export class KeytarKeychain implements KeychainBackend {
  async set(account: string, value: string): Promise<void> {
    const keytar = await import("keytar");
    await keytar.default.setPassword(SERVICE, account, value);
  }

  async get(account: string): Promise<string | null> {
    const keytar = await import("keytar");
    return keytar.default.getPassword(SERVICE, account);
  }

  async delete(account: string): Promise<boolean> {
    const keytar = await import("keytar");
    return keytar.default.deletePassword(SERVICE, account);
  }
}

export class TokenStore {
  constructor(private backend: KeychainBackend) {}

  async save(token: TokenSet): Promise<void> {
    await this.backend.set(FULL_KEY, JSON.stringify(token));
  }

  async load(): Promise<TokenSet | null> {
    const raw = await this.backend.get(FULL_KEY);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as TokenSet;
    } catch {
      return null;
    }
  }

  async clear(): Promise<void> {
    await this.backend.delete(FULL_KEY);
  }
}

export function defaultBackend(): KeychainBackend {
  return process.env["BRIKKO_USE_INMEM_KEYCHAIN"] === "1"
    ? new InMemoryKeychain()
    : new KeytarKeychain();
}
