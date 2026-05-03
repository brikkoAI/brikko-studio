import { afterEach, describe, expect, it, vi } from "vitest";
import { captureFullEnv } from "../test-utils/env.js";
import { SUPERVISOR_HINT_ENV_VARS } from "./supervisor-markers.js";

const spawnMock = vi.hoisted(() => vi.fn());
const triggerBrikkoStudioRestartMock = vi.hoisted(() => vi.fn());
const isContainerEnvironmentMock = vi.hoisted(() => vi.fn(() => false));

vi.mock("node:child_process", async () => {
  const { mockNodeBuiltinModule } = await import("brikko-studio/plugin-sdk/test-node-mocks");
  return mockNodeBuiltinModule(
    () => vi.importActual<typeof import("node:child_process")>("node:child_process"),
    {
      spawn: (...args: unknown[]) => spawnMock(...args),
    },
  );
});
vi.mock("./restart.js", () => ({
  triggerBrikkoStudioRestart: (...args: unknown[]) => triggerBrikkoStudioRestartMock(...args),
}));
vi.mock("./container-environment.js", () => ({
  isContainerEnvironment: () => isContainerEnvironmentMock(),
}));

import {
  respawnGatewayProcessForUpdate,
  restartGatewayProcessWithFreshPid,
} from "./process-respawn.js";

const originalArgv = [...process.argv];
const originalExecArgv = [...process.execArgv];
const envSnapshot = captureFullEnv();
const originalPlatformDescriptor = Object.getOwnPropertyDescriptor(process, "platform");

function setPlatform(platform: string) {
  if (!originalPlatformDescriptor) {
    return;
  }
  Object.defineProperty(process, "platform", {
    ...originalPlatformDescriptor,
    value: platform,
  });
}

afterEach(() => {
  envSnapshot.restore();
  process.argv = [...originalArgv];
  process.execArgv = [...originalExecArgv];
  spawnMock.mockClear();
  triggerBrikkoStudioRestartMock.mockClear();
  isContainerEnvironmentMock.mockReset();
  isContainerEnvironmentMock.mockReturnValue(false);
  if (originalPlatformDescriptor) {
    Object.defineProperty(process, "platform", originalPlatformDescriptor);
  }
});

function clearSupervisorHints() {
  for (const key of SUPERVISOR_HINT_ENV_VARS) {
    delete process.env[key];
  }
}

function expectLaunchdSupervisedWithoutKickstart(params?: { launchJobLabel?: string }) {
  setPlatform("darwin");
  if (params?.launchJobLabel) {
    process.env.LAUNCH_JOB_LABEL = params.launchJobLabel;
  }
  process.env.BRIKKO_STUDIO_LAUNCHD_LABEL = "ai.brikko-studio.gateway";
  const result = restartGatewayProcessWithFreshPid();
  expect(result).toEqual({ mode: "supervised" });
  expect(triggerBrikkoStudioRestartMock).not.toHaveBeenCalled();
  expect(spawnMock).not.toHaveBeenCalled();
}

describe("restartGatewayProcessWithFreshPid", () => {
  it("returns disabled when BRIKKO_STUDIO_NO_RESPAWN is set", () => {
    process.env.BRIKKO_STUDIO_NO_RESPAWN = "1";
    const result = restartGatewayProcessWithFreshPid();
    expect(result.mode).toBe("disabled");
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("keeps BRIKKO_STUDIO_NO_RESPAWN ahead of inherited supervisor hints", () => {
    clearSupervisorHints();
    setPlatform("darwin");
    process.env.BRIKKO_STUDIO_NO_RESPAWN = "1";
    process.env.LAUNCH_JOB_LABEL = "ai.brikko-studio.gateway";

    const result = restartGatewayProcessWithFreshPid();

    expect(result).toEqual({ mode: "disabled" });
    expect(triggerBrikkoStudioRestartMock).not.toHaveBeenCalled();
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("returns supervised when launchd hints are present on macOS (no kickstart)", () => {
    clearSupervisorHints();
    expectLaunchdSupervisedWithoutKickstart({ launchJobLabel: "ai.brikko-studio.gateway" });
  });

  it("returns supervised on macOS when launchd label is set (no kickstart)", () => {
    expectLaunchdSupervisedWithoutKickstart({ launchJobLabel: "ai.brikko-studio.gateway" });
  });

  it("launchd supervisor never returns failed regardless of triggerBrikkoStudioRestart outcome", () => {
    clearSupervisorHints();
    setPlatform("darwin");
    process.env.BRIKKO_STUDIO_LAUNCHD_LABEL = "ai.brikko-studio.gateway";
    // Even if triggerBrikkoStudioRestart *would* fail, launchd path must not call it.
    triggerBrikkoStudioRestartMock.mockReturnValue({
      ok: false,
      method: "launchctl",
      detail: "Bootstrap failed: 5: Input/output error",
    });
    const result = restartGatewayProcessWithFreshPid();
    expect(result.mode).toBe("supervised");
    expect(result.mode).not.toBe("failed");
    expect(triggerBrikkoStudioRestartMock).not.toHaveBeenCalled();
  });

  it("does not schedule kickstart on non-darwin platforms", () => {
    setPlatform("linux");
    process.env.INVOCATION_ID = "abc123";
    process.env.BRIKKO_STUDIO_LAUNCHD_LABEL = "ai.brikko-studio.gateway";

    const result = restartGatewayProcessWithFreshPid();

    expect(result.mode).toBe("supervised");
    expect(triggerBrikkoStudioRestartMock).not.toHaveBeenCalled();
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("returns supervised when XPC_SERVICE_NAME is set by launchd", () => {
    clearSupervisorHints();
    setPlatform("darwin");
    process.env.XPC_SERVICE_NAME = "ai.brikko-studio.gateway";
    const result = restartGatewayProcessWithFreshPid();
    expect(result.mode).toBe("supervised");
    expect(triggerBrikkoStudioRestartMock).not.toHaveBeenCalled();
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("spawns detached child with current exec argv", () => {
    delete process.env.BRIKKO_STUDIO_NO_RESPAWN;
    clearSupervisorHints();
    setPlatform("linux");
    process.execArgv = ["--import", "tsx"];
    process.argv = ["/usr/local/bin/node", "/repo/dist/index.js", "gateway", "run"];
    spawnMock.mockReturnValue({ pid: 4242, unref: vi.fn() });

    const result = restartGatewayProcessWithFreshPid();

    expect(result).toEqual({ mode: "spawned", pid: 4242 });
    expect(spawnMock).toHaveBeenCalledWith(
      process.execPath,
      ["--import", "tsx", "/repo/dist/index.js", "gateway", "run"],
      expect.objectContaining({
        detached: true,
        stdio: "inherit",
      }),
    );
  });

  it("returns supervised when BRIKKO_STUDIO_LAUNCHD_LABEL is set (stock launchd plist)", () => {
    clearSupervisorHints();
    expectLaunchdSupervisedWithoutKickstart();
  });

  it("returns supervised when BRIKKO_STUDIO_SYSTEMD_UNIT is set", () => {
    clearSupervisorHints();
    setPlatform("linux");
    process.env.BRIKKO_STUDIO_SYSTEMD_UNIT = "brikko-studio-gateway.service";
    const result = restartGatewayProcessWithFreshPid();
    expect(result.mode).toBe("supervised");
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("returns supervised when BrikkoStudio gateway task markers are set on Windows", () => {
    clearSupervisorHints();
    setPlatform("win32");
    process.env.BRIKKO_STUDIO_SERVICE_MARKER = "brikko-studio";
    process.env.BRIKKO_STUDIO_SERVICE_KIND = "gateway";
    triggerBrikkoStudioRestartMock.mockReturnValue({ ok: true, method: "schtasks" });
    const result = restartGatewayProcessWithFreshPid();
    expect(result.mode).toBe("supervised");
    expect(triggerBrikkoStudioRestartMock).toHaveBeenCalledOnce();
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("keeps generic service markers out of non-Windows supervisor detection", () => {
    clearSupervisorHints();
    setPlatform("linux");
    process.env.BRIKKO_STUDIO_SERVICE_MARKER = "brikko-studio";
    process.env.BRIKKO_STUDIO_SERVICE_KIND = "gateway";
    spawnMock.mockReturnValue({ pid: 4242, unref: vi.fn() });

    const result = restartGatewayProcessWithFreshPid();

    expect(result).toEqual({ mode: "spawned", pid: 4242 });
    expect(triggerBrikkoStudioRestartMock).not.toHaveBeenCalled();
  });

  it("returns disabled on Windows without Scheduled Task markers", () => {
    clearSupervisorHints();
    setPlatform("win32");

    const result = restartGatewayProcessWithFreshPid();

    expect(result.mode).toBe("disabled");
    expect(result.detail).toContain("Scheduled Task");
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("returns disabled in containers so PID 1 stays alive for in-process restart", () => {
    delete process.env.BRIKKO_STUDIO_NO_RESPAWN;
    clearSupervisorHints();
    setPlatform("linux");
    isContainerEnvironmentMock.mockReturnValue(true);

    const result = restartGatewayProcessWithFreshPid();

    expect(result).toEqual({
      mode: "disabled",
      detail: "container: use in-process restart to keep PID 1 alive",
    });
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("ignores node task script hints for gateway restart detection on Windows", () => {
    clearSupervisorHints();
    setPlatform("win32");
    process.env.BRIKKO_STUDIO_TASK_SCRIPT = "C:\\brikko-studio\\node.cmd";
    process.env.BRIKKO_STUDIO_TASK_SCRIPT_NAME = "node.cmd";
    process.env.BRIKKO_STUDIO_SERVICE_MARKER = "brikko-studio";
    process.env.BRIKKO_STUDIO_SERVICE_KIND = "node";

    const result = restartGatewayProcessWithFreshPid();

    expect(result.mode).toBe("disabled");
    expect(triggerBrikkoStudioRestartMock).not.toHaveBeenCalled();
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("returns failed when spawn throws", () => {
    delete process.env.BRIKKO_STUDIO_NO_RESPAWN;
    clearSupervisorHints();
    setPlatform("linux");

    spawnMock.mockImplementation(() => {
      throw new Error("spawn failed");
    });
    const result = restartGatewayProcessWithFreshPid();
    expect(result.mode).toBe("failed");
    expect(result.detail).toContain("spawn failed");
  });
});

describe("respawnGatewayProcessForUpdate", () => {
  it("keeps BRIKKO_STUDIO_NO_RESPAWN semantics for update restarts", () => {
    clearSupervisorHints();
    process.env.BRIKKO_STUDIO_NO_RESPAWN = "1";

    const result = respawnGatewayProcessForUpdate();

    expect(result).toEqual({ mode: "disabled", detail: "BRIKKO_STUDIO_NO_RESPAWN" });
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("allows detached respawn on unmanaged Windows during updates", () => {
    clearSupervisorHints();
    setPlatform("win32");
    process.execArgv = [];
    process.argv = [
      "C:\\Program Files\\node.exe",
      "C:\\brikko-studio\\dist\\index.js",
      "gateway",
      "run",
    ];
    spawnMock.mockReturnValue({ pid: 5151, unref: vi.fn(), kill: vi.fn() });

    const result = respawnGatewayProcessForUpdate();

    expect(result.mode).toBe("spawned");
    expect(result.pid).toBe(5151);
    expect(spawnMock).toHaveBeenCalledWith(
      process.execPath,
      ["C:\\brikko-studio\\dist\\index.js", "gateway", "run"],
      expect.objectContaining({
        detached: true,
        env: process.env,
        stdio: "inherit",
      }),
    );
  });
});
