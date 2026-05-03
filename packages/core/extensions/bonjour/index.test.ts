import { createTestPluginApi } from "brikko-studio/plugin-sdk/plugin-test-api";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  advertiserModuleLoaded: vi.fn(),
  runtimeModuleLoaded: vi.fn(),
  startGatewayBonjourAdvertiser: vi.fn(async () => ({ stop: vi.fn() })),
  registerUncaughtExceptionHandler: vi.fn(),
  registerUnhandledRejectionHandler: vi.fn(),
}));

vi.mock("./src/advertiser.js", () => {
  mocks.advertiserModuleLoaded();
  return {
    startGatewayBonjourAdvertiser: mocks.startGatewayBonjourAdvertiser,
  };
});

vi.mock("brikko-studio/plugin-sdk/runtime", () => {
  mocks.runtimeModuleLoaded();
  return {
    registerUncaughtExceptionHandler: mocks.registerUncaughtExceptionHandler,
    registerUnhandledRejectionHandler: mocks.registerUnhandledRejectionHandler,
  };
});

const { default: bonjourPlugin } = await import("./index.js");

describe("bonjour plugin entry", () => {
  it("lazy-loads advertiser runtime when gateway discovery advertises", async () => {
    let discoveryService:
      | Parameters<ReturnType<typeof createTestPluginApi>["registerGatewayDiscoveryService"]>[0]
      | undefined;
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };
    const api = createTestPluginApi({
      logger,
      registerGatewayDiscoveryService(service) {
        discoveryService = service;
      },
    });

    expect(mocks.advertiserModuleLoaded).not.toHaveBeenCalled();
    expect(mocks.runtimeModuleLoaded).not.toHaveBeenCalled();

    bonjourPlugin.register(api);

    expect(discoveryService?.id).toBe("bonjour");
    expect(mocks.advertiserModuleLoaded).not.toHaveBeenCalled();
    expect(mocks.runtimeModuleLoaded).not.toHaveBeenCalled();

    if (!discoveryService) {
      throw new Error("expected bonjour plugin to register a discovery service");
    }

    const stop = vi.fn();
    mocks.startGatewayBonjourAdvertiser.mockResolvedValueOnce({ stop });

    await expect(
      discoveryService.advertise({
        machineDisplayName: "Dev Box",
        gatewayPort: 3210,
        gatewayTlsEnabled: true,
        gatewayTlsFingerprintSha256: "abc123",
        canvasPort: 9876,
        sshPort: 22,
        tailnetDns: "dev.tailnet.ts.net",
        cliPath: "/usr/local/bin/brikko-studio",
        minimal: false,
      }),
    ).resolves.toEqual({ stop });

    expect(mocks.advertiserModuleLoaded).toHaveBeenCalledTimes(1);
    expect(mocks.runtimeModuleLoaded).toHaveBeenCalledTimes(1);
    expect(mocks.startGatewayBonjourAdvertiser).toHaveBeenCalledWith(
      {
        instanceName: "Dev Box (BrikkoStudio)",
        gatewayPort: 3210,
        gatewayTlsEnabled: true,
        gatewayTlsFingerprintSha256: "abc123",
        canvasPort: 9876,
        sshPort: 22,
        tailnetDns: "dev.tailnet.ts.net",
        cliPath: "/usr/local/bin/brikko-studio",
        minimal: false,
      },
      {
        logger,
        registerUncaughtExceptionHandler: mocks.registerUncaughtExceptionHandler,
        registerUnhandledRejectionHandler: mocks.registerUnhandledRejectionHandler,
      },
    );
  });
});
