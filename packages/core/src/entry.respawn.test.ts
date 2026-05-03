import { describe, expect, it } from "vitest";
import {
  buildCliRespawnPlan,
  EXPERIMENTAL_WARNING_FLAG,
  BRIKKO_STUDIO_NODE_EXTRA_CA_CERTS_READY,
  BRIKKO_STUDIO_NODE_OPTIONS_READY,
  resolveCliRespawnCommand,
} from "./entry.respawn.js";

describe("buildCliRespawnPlan", () => {
  it("returns null when respawn policy skips the argv", () => {
    expect(
      buildCliRespawnPlan({
        argv: ["node", "brikko-studio", "--help"],
        env: {},
        execArgv: [],
        autoNodeExtraCaCerts: "/etc/ssl/certs/ca-certificates.crt",
      }),
    ).toBeNull();
  });

  it("adds NODE_EXTRA_CA_CERTS and warning suppression in one respawn", () => {
    const plan = buildCliRespawnPlan({
      argv: ["node", "brikko-studio", "status"],
      env: {},
      execArgv: [],
      autoNodeExtraCaCerts: "/etc/ssl/certs/ca-certificates.crt",
    });

    expect(plan).not.toBeNull();
    expect(plan?.command).toBe(process.execPath);
    expect(plan?.argv[0]).toBe(EXPERIMENTAL_WARNING_FLAG);
    expect(plan?.env.NODE_EXTRA_CA_CERTS).toBe("/etc/ssl/certs/ca-certificates.crt");
    expect(plan?.env[BRIKKO_STUDIO_NODE_EXTRA_CA_CERTS_READY]).toBe("1");
    expect(plan?.env[BRIKKO_STUDIO_NODE_OPTIONS_READY]).toBe("1");
  });

  it("does not overwrite an existing NODE_EXTRA_CA_CERTS value", () => {
    const plan = buildCliRespawnPlan({
      argv: ["node", "brikko-studio", "status"],
      env: { NODE_EXTRA_CA_CERTS: "/custom/ca.pem" },
      execArgv: [],
      autoNodeExtraCaCerts: "/etc/ssl/certs/ca-certificates.crt",
    });

    expect(plan?.env.NODE_EXTRA_CA_CERTS).toBe("/custom/ca.pem");
  });

  it("returns null when both respawn guards are already satisfied", () => {
    expect(
      buildCliRespawnPlan({
        argv: ["node", "brikko-studio", "status"],
        env: {
          [BRIKKO_STUDIO_NODE_EXTRA_CA_CERTS_READY]: "1",
          [BRIKKO_STUDIO_NODE_OPTIONS_READY]: "1",
        },
        execArgv: [EXPERIMENTAL_WARNING_FLAG],
        autoNodeExtraCaCerts: "/etc/ssl/certs/ca-certificates.crt",
      }),
    ).toBeNull();
  });

  it("does not respawn on Windows", () => {
    expect(
      buildCliRespawnPlan({
        argv: [
          "node",
          "C:\\Users\\alice\\AppData\\Roaming\\npm\\node_modules\\brikko-studio\\brikko-studio.mjs",
          "onboard",
        ],
        env: {},
        execArgv: [],
        autoNodeExtraCaCerts: "/etc/ssl/certs/ca-certificates.crt",
        platform: "win32",
      }),
    ).toBeNull();
  });

  it("respawns Volta shims through node so the shim is not called directly", () => {
    const plan = buildCliRespawnPlan({
      argv: ["/home/alice/.volta/bin/volta-shim", "/usr/local/bin/brikko-studio", "status"],
      env: { PATH: "/home/alice/.volta/bin:/usr/bin:/bin" },
      execArgv: [],
      execPath: "/home/alice/.volta/bin/volta-shim",
      autoNodeExtraCaCerts: undefined,
      platform: "linux",
    });

    expect(plan?.command).toBe("node");
    expect(plan?.argv).toEqual([EXPERIMENTAL_WARNING_FLAG, "/usr/local/bin/brikko-studio", "status"]);
  });
});

describe("resolveCliRespawnCommand", () => {
  it("keeps normal node paths absolute", () => {
    expect(resolveCliRespawnCommand({ execPath: "/usr/bin/node", platform: "linux" })).toBe(
      "/usr/bin/node",
    );
  });

  it("maps Volta's Unix shim target back to the named node shim", () => {
    expect(
      resolveCliRespawnCommand({
        execPath: "/home/alice/.volta/bin/volta-shim",
        platform: "linux",
      }),
    ).toBe("node");
  });
});
