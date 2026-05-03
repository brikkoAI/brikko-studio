import { describe, expect, it, vi } from "vitest";
import { resolveRemoteEmbeddingBearerClient } from "./embeddings-remote-client.js";

describe("resolveRemoteEmbeddingBearerClient", () => {
  it("adds Brikko Studio attribution to native OpenAI embedding requests", async () => {
    vi.stubEnv("BRIKKO_STUDIO_VERSION", "2026.3.22");
    const client = await resolveRemoteEmbeddingBearerClient({
      provider: "openai",
      defaultBaseUrl: "https://api.openai.com/v1",
      options: {
        config: { models: {} } as never,
        model: "text-embedding-3-large",
        remote: {
          apiKey: "sk-test",
          headers: {
            originator: "pi",
            "User-Agent": "pi",
          },
        },
      },
    });

    expect(client.headers).toMatchObject({
      originator: "brikko-studio",
      version: "2026.3.22",
      "User-Agent": "brikko-studio/2026.3.22",
    });
  });
});
