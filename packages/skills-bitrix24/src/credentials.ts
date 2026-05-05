import { CredentialsMissingError } from "./errors.js";

const SERVICE = "brikko-studio";
const ACCOUNT = "bitrix24";

export interface Bitrix24Credentials {
  /** Portal URL, e.g. https://acme.bitrix24.ru */
  portalUrl: string;
  /** Webhook token component (user_id/secret) from inbound webhook URL, e.g. "1/xyz_abcdef" */
  webhookToken: string;
}

export interface CredentialsBackend {
  get(account: string): Promise<string | null>;
  set(account: string, value: string): Promise<void>;
  delete(account: string): Promise<boolean>;
}

export class InMemoryBackend implements CredentialsBackend {
  private store = new Map<string, string>();
  async get(account: string): Promise<string | null> {
    return this.store.get(account) ?? null;
  }
  async set(account: string, value: string): Promise<void> {
    this.store.set(account, value);
  }
  async delete(account: string): Promise<boolean> {
    return this.store.delete(account);
  }
}

export class KeytarBackend implements CredentialsBackend {
  async get(account: string): Promise<string | null> {
    const keytar = await import("keytar");
    return keytar.default.getPassword(SERVICE, account);
  }
  async set(account: string, value: string): Promise<void> {
    const keytar = await import("keytar");
    await keytar.default.setPassword(SERVICE, account, value);
  }
  async delete(account: string): Promise<boolean> {
    const keytar = await import("keytar");
    return keytar.default.deletePassword(SERVICE, account);
  }
}

export async function loadCredentials(
  backend: CredentialsBackend,
): Promise<Bitrix24Credentials> {
  const raw = await backend.get(ACCOUNT);
  if (raw === null) throw new CredentialsMissingError();
  let parsed: Bitrix24Credentials;
  try {
    parsed = JSON.parse(raw) as Bitrix24Credentials;
  } catch {
    throw new CredentialsMissingError();
  }
  if (!parsed.portalUrl || !parsed.webhookToken) {
    throw new CredentialsMissingError();
  }
  return parsed;
}

export async function saveCredentials(
  backend: CredentialsBackend,
  creds: Bitrix24Credentials,
): Promise<void> {
  await backend.set(ACCOUNT, JSON.stringify(creds));
}

export function defaultBackend(): CredentialsBackend {
  return process.env["BRIKKO_USE_INMEM_KEYCHAIN"] === "1"
    ? new InMemoryBackend()
    : new KeytarBackend();
}
