import { OneCCredentialsMissingError } from "./errors.js";

const SERVICE = "brikko-studio";
const ACCOUNT = "1c";

export interface OneCCredentials {
  /** OData root, e.g. https://1c.acme.ru/InfoBase/odata/standard.odata */
  odataUrl: string;
  username: string;
  password: string;
}

export interface CredentialsBackend {
  get(account: string): Promise<string | null>;
  set(account: string, value: string): Promise<void>;
  delete(account: string): Promise<boolean>;
}

export class InMemoryBackend implements CredentialsBackend {
  private store = new Map<string, string>();
  async get(a: string): Promise<string | null> {
    return this.store.get(a) ?? null;
  }
  async set(a: string, v: string): Promise<void> {
    this.store.set(a, v);
  }
  async delete(a: string): Promise<boolean> {
    return this.store.delete(a);
  }
}

export class KeytarBackend implements CredentialsBackend {
  async get(a: string): Promise<string | null> {
    const keytar = await import("keytar");
    return keytar.default.getPassword(SERVICE, a);
  }
  async set(a: string, v: string): Promise<void> {
    const keytar = await import("keytar");
    await keytar.default.setPassword(SERVICE, a, v);
  }
  async delete(a: string): Promise<boolean> {
    const keytar = await import("keytar");
    return keytar.default.deletePassword(SERVICE, a);
  }
}

export async function loadCredentials(
  b: CredentialsBackend,
): Promise<OneCCredentials> {
  const raw = await b.get(ACCOUNT);
  if (raw === null) throw new OneCCredentialsMissingError();
  let parsed: OneCCredentials;
  try {
    parsed = JSON.parse(raw) as OneCCredentials;
  } catch {
    throw new OneCCredentialsMissingError();
  }
  if (!parsed.odataUrl || !parsed.username || !parsed.password) {
    throw new OneCCredentialsMissingError();
  }
  return parsed;
}

export async function saveCredentials(
  b: CredentialsBackend,
  c: OneCCredentials,
): Promise<void> {
  await b.set(ACCOUNT, JSON.stringify(c));
}

export function defaultBackend(): CredentialsBackend {
  return process.env["BRIKKO_USE_INMEM_KEYCHAIN"] === "1"
    ? new InMemoryBackend()
    : new KeytarBackend();
}
