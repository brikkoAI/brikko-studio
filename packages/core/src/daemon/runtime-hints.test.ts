import { describe, expect, it } from "vitest";
import { buildPlatformRuntimeLogHints, buildPlatformServiceStartHints } from "./runtime-hints.js";

describe("buildPlatformRuntimeLogHints", () => {
  it("renders launchd log hints on darwin", () => {
    expect(
      buildPlatformRuntimeLogHints({
        platform: "darwin",
        env: {
          BRIKKO_STUDIO_STATE_DIR: "/tmp/brikko-studio-state",
          BRIKKO_STUDIO_LOG_PREFIX: "gateway",
        },
        systemdServiceName: "brikko-studio-gateway",
        windowsTaskName: "BrikkoStudio Gateway",
      }),
    ).toEqual([
      "Launchd stdout (if installed): /tmp/brikko-studio-state/logs/gateway.log",
      "Launchd stderr (if installed): /tmp/brikko-studio-state/logs/gateway.err.log",
      "Restart attempts: /tmp/brikko-studio-state/logs/gateway-restart.log",
    ]);
  });

  it("renders systemd and windows hints by platform", () => {
    expect(
      buildPlatformRuntimeLogHints({
        platform: "linux",
        env: {
          BRIKKO_STUDIO_STATE_DIR: "/tmp/brikko-studio-state",
        },
        systemdServiceName: "brikko-studio-gateway",
        windowsTaskName: "BrikkoStudio Gateway",
      }),
    ).toEqual([
      "Logs: journalctl --user -u brikko-studio-gateway.service -n 200 --no-pager",
      "Restart attempts: /tmp/brikko-studio-state/logs/gateway-restart.log",
    ]);
    expect(
      buildPlatformRuntimeLogHints({
        platform: "win32",
        env: {
          BRIKKO_STUDIO_STATE_DIR: "/tmp/brikko-studio-state",
        },
        systemdServiceName: "brikko-studio-gateway",
        windowsTaskName: "BrikkoStudio Gateway",
      }),
    ).toEqual([
      'Logs: schtasks /Query /TN "BrikkoStudio Gateway" /V /FO LIST',
      "Restart attempts: /tmp/brikko-studio-state/logs/gateway-restart.log",
    ]);
  });
});

describe("buildPlatformServiceStartHints", () => {
  it("builds platform-specific service start hints", () => {
    expect(
      buildPlatformServiceStartHints({
        platform: "darwin",
        installCommand: "brikko-studio gateway install",
        startCommand: "brikko-studio gateway",
        launchAgentPlistPath: "~/Library/LaunchAgents/com.brikko-studio.gateway.plist",
        systemdServiceName: "brikko-studio-gateway",
        windowsTaskName: "BrikkoStudio Gateway",
      }),
    ).toEqual([
      "brikko-studio gateway install",
      "brikko-studio gateway",
      "launchctl bootstrap gui/$UID ~/Library/LaunchAgents/com.brikko-studio.gateway.plist",
    ]);
    expect(
      buildPlatformServiceStartHints({
        platform: "linux",
        installCommand: "brikko-studio gateway install",
        startCommand: "brikko-studio gateway",
        launchAgentPlistPath: "~/Library/LaunchAgents/com.brikko-studio.gateway.plist",
        systemdServiceName: "brikko-studio-gateway",
        windowsTaskName: "BrikkoStudio Gateway",
      }),
    ).toEqual([
      "brikko-studio gateway install",
      "brikko-studio gateway",
      "systemctl --user start brikko-studio-gateway.service",
    ]);
  });
});
