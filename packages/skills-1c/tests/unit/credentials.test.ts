import { describe, expect, it } from "vitest";
import {
  InMemoryBackend,
  loadCredentials,
  saveCredentials,
} from "../../src/credentials.js";
import { OneCCredentialsMissingError } from "../../src/errors.js";

describe("1С credentials store", () => {
  it("saves and loads valid credentials", async () => {
    const backend = new InMemoryBackend();
    await saveCredentials(backend, {
      odataUrl: "https://1c.acme.ru/InfoBase/odata/standard.odata",
      username: "studio",
      password: "secret",
    });
    const loaded = await loadCredentials(backend);
    expect(loaded.odataUrl).toContain("acme.ru");
    expect(loaded.username).toBe("studio");
    expect(loaded.password).toBe("secret");
  });

  it("throws OneCCredentialsMissingError when nothing saved", async () => {
    const backend = new InMemoryBackend();
    await expect(loadCredentials(backend)).rejects.toBeInstanceOf(
      OneCCredentialsMissingError,
    );
  });

  it("throws on malformed JSON", async () => {
    const backend = new InMemoryBackend();
    await backend.set("1c", "not-json{{");
    await expect(loadCredentials(backend)).rejects.toBeInstanceOf(
      OneCCredentialsMissingError,
    );
  });

  it("throws when required fields missing", async () => {
    const backend = new InMemoryBackend();
    await backend.set(
      "1c",
      JSON.stringify({ odataUrl: "x", username: "u" }),
    );
    await expect(loadCredentials(backend)).rejects.toBeInstanceOf(
      OneCCredentialsMissingError,
    );
  });
});
