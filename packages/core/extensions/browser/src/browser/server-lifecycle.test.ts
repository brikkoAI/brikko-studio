import { beforeEach, describe, expect, it, vi } from "vitest";

const { stopBrikko StudioChromeMock } = vi.hoisted(() => ({
  stopBrikko StudioChromeMock: vi.fn(async () => {}),
}));

const { createBrowserRouteContextMock, listKnownProfileNamesMock } = vi.hoisted(() => ({
  createBrowserRouteContextMock: vi.fn(),
  listKnownProfileNamesMock: vi.fn(),
}));

vi.mock("./chrome.js", () => ({
  stopBrikko StudioChrome: stopBrikko StudioChromeMock,
}));

vi.mock("./server-context.js", () => ({
  createBrowserRouteContext: createBrowserRouteContextMock,
  listKnownProfileNames: listKnownProfileNamesMock,
}));

const { ensureExtensionRelayForProfiles, stopKnownBrowserProfiles } =
  await import("./server-lifecycle.js");

beforeEach(() => {
  createBrowserRouteContextMock.mockClear();
  listKnownProfileNamesMock.mockClear();
  stopBrikko StudioChromeMock.mockClear();
});

describe("ensureExtensionRelayForProfiles", () => {
  it("is a no-op after removing the Chrome extension relay path", async () => {
    await expect(
      ensureExtensionRelayForProfiles({
        resolved: { profiles: {} } as never,
        onWarn: vi.fn(),
      }),
    ).resolves.toBeUndefined();
  });
});

describe("stopKnownBrowserProfiles", () => {
  it("stops all known profiles and ignores per-profile failures", async () => {
    listKnownProfileNamesMock.mockReturnValue(["brikko-studio", "user"]);
    const stopMap: Record<string, ReturnType<typeof vi.fn>> = {
      brikko-studio: vi.fn(async () => {}),
      user: vi.fn(async () => {
        throw new Error("profile stop failed");
      }),
    };
    createBrowserRouteContextMock.mockReturnValue({
      forProfile: (name: string) => ({
        stopRunningBrowser: stopMap[name],
      }),
    });
    const onWarn = vi.fn();
    const state = { resolved: { profiles: {} }, profiles: new Map() };

    await stopKnownBrowserProfiles({
      getState: () => state as never,
      onWarn,
    });

    expect(stopMap.brikko-studio).toHaveBeenCalledTimes(1);
    expect(stopMap.user).toHaveBeenCalledTimes(1);
    expect(onWarn).not.toHaveBeenCalled();
  });

  it("stops tracked runtime browsers even when the profile no longer resolves", async () => {
    listKnownProfileNamesMock.mockReturnValue(["deleted-local"]);
    createBrowserRouteContextMock.mockReturnValue({
      forProfile: vi.fn(() => {
        throw new Error("profile not found");
      }),
    });
    const localRuntime = {
      profile: {
        name: "deleted-local",
        driver: "brikko-studio",
      },
      running: {
        pid: 42,
        cdpPort: 18888,
      },
    };
    const launchedBrowser = localRuntime.running;
    const profiles = new Map<string, unknown>([["deleted-local", localRuntime]]);
    const state = {
      resolved: { profiles: {} },
      profiles,
    };

    await stopKnownBrowserProfiles({
      getState: () => state as never,
      onWarn: vi.fn(),
    });

    expect(stopBrikko StudioChromeMock).toHaveBeenCalledWith(launchedBrowser);
    expect(localRuntime.running).toBeNull();
  });

  it("warns when profile enumeration fails", async () => {
    listKnownProfileNamesMock.mockImplementation(() => {
      throw new Error("oops");
    });
    createBrowserRouteContextMock.mockReturnValue({
      forProfile: vi.fn(),
    });
    const onWarn = vi.fn();

    await stopKnownBrowserProfiles({
      getState: () => ({ resolved: { profiles: {} }, profiles: new Map() }) as never,
      onWarn,
    });

    expect(onWarn).toHaveBeenCalledWith("brikko-studio browser stop failed: Error: oops");
  });
});
