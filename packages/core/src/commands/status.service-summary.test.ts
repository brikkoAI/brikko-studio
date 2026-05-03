import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { GatewayService } from "../daemon/service.js";
import type { GatewayServiceEnvArgs } from "../daemon/service.js";
import { createMockGatewayService } from "../daemon/service.test-helpers.js";
import { withTempDir } from "../test-helpers/temp-dir.js";
import { readServiceStatusSummary } from "./status.service-summary.js";

function createService(overrides: Partial<GatewayService>): GatewayService {
  return createMockGatewayService({
    label: "systemd",
    loadedText: "enabled",
    notLoadedText: "disabled",
    ...overrides,
  });
}

describe("readServiceStatusSummary", () => {
  it("marks Brikko Studio-managed services as installed", async () => {
    const summary = await readServiceStatusSummary(
      createService({
        isLoaded: vi.fn(async () => true),
        readCommand: vi.fn(async () => ({ programArguments: ["brikko-studio", "gateway", "run"] })),
        readRuntime: vi.fn(async () => ({ status: "running" })),
      }),
      "Daemon",
    );

    expect(summary.installed).toBe(true);
    expect(summary.managedByBrikko Studio).toBe(true);
    expect(summary.externallyManaged).toBe(false);
    expect(summary.loadedText).toBe("enabled");
  });

  it("marks running unmanaged services as externally managed", async () => {
    const summary = await readServiceStatusSummary(
      createService({
        readRuntime: vi.fn(async () => ({ status: "running" })),
      }),
      "Daemon",
    );

    expect(summary.installed).toBe(true);
    expect(summary.managedByBrikko Studio).toBe(false);
    expect(summary.externallyManaged).toBe(true);
    expect(summary.loadedText).toBe("running (externally managed)");
  });

  it("keeps missing services as not installed when nothing is running", async () => {
    const summary = await readServiceStatusSummary(createService({}), "Daemon");

    expect(summary.installed).toBe(false);
    expect(summary.managedByBrikko Studio).toBe(false);
    expect(summary.externallyManaged).toBe(false);
    expect(summary.loadedText).toBe("disabled");
  });

  it("passes command environment to runtime and loaded checks", async () => {
    const isLoaded = vi.fn(async ({ env }: GatewayServiceEnvArgs) => {
      return env?.BRIKKO_STUDIO_GATEWAY_PORT === "18789";
    });
    const readRuntime = vi.fn(async (env?: NodeJS.ProcessEnv) => ({
      status: env?.BRIKKO_STUDIO_GATEWAY_PORT === "18789" ? ("running" as const) : ("unknown" as const),
    }));

    const summary = await readServiceStatusSummary(
      createService({
        isLoaded,
        readCommand: vi.fn(async () => ({
          programArguments: ["brikko-studio", "gateway", "run", "--port", "18789"],
          environment: { BRIKKO_STUDIO_GATEWAY_PORT: "18789" },
        })),
        readRuntime,
      }),
      "Daemon",
    );

    expect(isLoaded).toHaveBeenCalledWith(
      expect.objectContaining({
        env: expect.objectContaining({
          BRIKKO_STUDIO_GATEWAY_PORT: "18789",
        }),
      }),
    );
    expect(readRuntime).toHaveBeenCalledWith(
      expect.objectContaining({
        BRIKKO_STUDIO_GATEWAY_PORT: "18789",
      }),
    );
    expect(summary.installed).toBe(true);
    expect(summary.loaded).toBe(true);
    expect(summary.runtime).toMatchObject({ status: "running" });
  });

  it("includes service layout diagnostics and flags source checkout entrypoints", async () => {
    await withTempDir({ prefix: "brikko-studio-status-service-layout-" }, async (root) => {
      await fs.mkdir(path.join(root, ".git"), { recursive: true });
      await fs.mkdir(path.join(root, "src"), { recursive: true });
      await fs.mkdir(path.join(root, "extensions"), { recursive: true });
      await fs.mkdir(path.join(root, "dist"), { recursive: true });
      await fs.writeFile(
        path.join(root, "package.json"),
        JSON.stringify({ name: "brikko-studio", version: "0.0.0-test" }),
        "utf8",
      );
      const entrypoint = path.join(root, "dist", "index.js");
      const serviceFile = path.join(root, "brikko-studio-gateway.service");
      await fs.writeFile(entrypoint, "export {};\n", "utf8");
      await fs.writeFile(serviceFile, "[Service]\n", "utf8");
      const realRoot = await fs.realpath(root);

      const summary = await readServiceStatusSummary(
        createService({
          isLoaded: vi.fn(async () => true),
          readCommand: vi.fn(async () => ({
            programArguments: ["/usr/bin/node", entrypoint, "gateway", "run"],
            sourcePath: serviceFile,
          })),
          readRuntime: vi.fn(async () => ({ status: "running" })),
        }),
        "Daemon",
      );

      expect(summary.layout).toMatchObject({
        sourcePath: serviceFile,
        sourcePathReal: path.join(realRoot, "brikko-studio-gateway.service"),
        entrypoint,
        entrypointReal: path.join(realRoot, "dist", "index.js"),
        packageRoot: realRoot,
        packageRootReal: realRoot,
        packageVersion: "0.0.0-test",
        entrypointSourceCheckout: true,
      });
      expect(summary.layout?.execStart).toContain("gateway run");
    });
  });
});
