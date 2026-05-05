import { describe, expect, it } from "vitest";
import {
  InMemoryBackend,
  loadCredentials,
  saveCredentials,
} from "../../src/credentials.js";
import { CredentialsMissingError } from "../../src/errors.js";

describe("credentials store", () => {
  it("saves and loads valid credentials", async () => {
    const backend = new InMemoryBackend();
    await saveCredentials(backend, {
      portalUrl: "https://acme.bitrix24.ru",
      webhookToken: "1/xyz",
    });
    const loaded = await loadCredentials(backend);
    expect(loaded.portalUrl).toBe("https://acme.bitrix24.ru");
    expect(loaded.webhookToken).toBe("1/xyz");
  });

  it("throws CredentialsMissingError when nothing saved", async () => {
    const backend = new InMemoryBackend();
    await expect(loadCredentials(backend)).rejects.toBeInstanceOf(
      CredentialsMissingError,
    );
  });

  it("throws CredentialsMissingError on malformed JSON", async () => {
    const backend = new InMemoryBackend();
    await backend.set("bitrix24", "not-json{{{");
    await expect(loadCredentials(backend)).rejects.toBeInstanceOf(
      CredentialsMissingError,
    );
  });

  it("throws when required fields missing", async () => {
    const backend = new InMemoryBackend();
    await backend.set("bitrix24", JSON.stringify({ portalUrl: "x" }));
    await expect(loadCredentials(backend)).rejects.toBeInstanceOf(
      CredentialsMissingError,
    );
  });
});
