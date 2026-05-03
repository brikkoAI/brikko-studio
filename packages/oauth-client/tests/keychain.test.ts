import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryKeychain, TokenStore } from "../src/keychain.js";
import type { TokenSet } from "../src/types.js";

const SAMPLE: TokenSet = {
  access_token: "atk_abc",
  refresh_token: "rtk_xyz",
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: "Bearer",
  scope: "chat.read messages.read embeddings.read audio.read",
  user_email: "user@brikko.ru",
};

describe("TokenStore (with InMemoryKeychain)", () => {
  let store: TokenStore;

  beforeEach(() => {
    store = new TokenStore(new InMemoryKeychain());
  });

  it("returns null when no token is stored", async () => {
    expect(await store.load()).toBeNull();
  });

  it("persists and reloads a token set", async () => {
    await store.save(SAMPLE);
    const loaded = await store.load();
    expect(loaded).toEqual(SAMPLE);
  });

  it("clears the stored token", async () => {
    await store.save(SAMPLE);
    await store.clear();
    expect(await store.load()).toBeNull();
  });

  it("returns null when stored value is corrupt JSON", async () => {
    const backend = new InMemoryKeychain();
    await backend.set("brikko-studio:tokens", "not-json{{");
    const corruptStore = new TokenStore(backend);
    expect(await corruptStore.load()).toBeNull();
  });
});
