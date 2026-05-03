import { describe, expect, it, vi } from "vitest";
import { planCrestodianCommandWithConfiguredModel } from "./assistant.js";

describe("Crestodian configured-model planner", () => {
  it("skips the configured model path when no config file exists", async () => {
    const readConfigFileSnapshot = vi.fn(async () => ({
      path: "/tmp/brikko-studio.json",
      exists: false,
      raw: null,
      parsed: {},
      sourceConfig: {},
      resolved: {},
      valid: true,
      runtimeConfig: {},
      config: {},
      issues: [],
      legacyIssues: [],
      warnings: [],
    }));
    const prepareSimpleCompletionModelForAgent = vi.fn();

    await expect(
      planCrestodianCommandWithConfiguredModel({
        input: "please set up my model",
        overview: {
          config: {
            path: "/tmp/brikko-studio.json",
            exists: false,
            valid: true,
            issues: [],
            hash: null,
          },
          agents: [],
          defaultAgentId: "main",
          tools: {
            codex: { command: "codex", found: false },
            claude: { command: "claude", found: false },
            apiKeys: { openai: false, anthropic: false },
          },
          gateway: {
            url: "ws://127.0.0.1:18789",
            source: "local loopback",
            reachable: false,
          },
          references: {
            docsUrl: "https://docs.brikko-studio.ai",
            sourceUrl: "https://github.com/brikko-studio/brikko-studio",
          },
        },
        deps: {
          readConfigFileSnapshot,
          prepareSimpleCompletionModelForAgent,
        },
      }),
    ).resolves.toBeNull();

    expect(prepareSimpleCompletionModelForAgent).not.toHaveBeenCalled();
  });
});
