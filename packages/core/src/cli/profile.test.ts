import path from "node:path";
import { describe, expect, it } from "vitest";
import { formatCliCommand } from "./command-format.js";
import { applyCliProfileEnv, parseCliProfileArgs } from "./profile.js";

describe("parseCliProfileArgs", () => {
  it("leaves gateway --dev for subcommands", () => {
    const res = parseCliProfileArgs([
      "node",
      "brikko-studio",
      "gateway",
      "--dev",
      "--allow-unconfigured",
    ]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBeNull();
    expect(res.argv).toEqual(["node", "brikko-studio", "gateway", "--dev", "--allow-unconfigured"]);
  });

  it("leaves gateway --dev for subcommands after leading root options", () => {
    const res = parseCliProfileArgs([
      "node",
      "brikko-studio",
      "--no-color",
      "gateway",
      "--dev",
      "--allow-unconfigured",
    ]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBeNull();
    expect(res.argv).toEqual([
      "node",
      "brikko-studio",
      "--no-color",
      "gateway",
      "--dev",
      "--allow-unconfigured",
    ]);
  });

  it("still accepts global --dev before subcommand", () => {
    const res = parseCliProfileArgs(["node", "brikko-studio", "--dev", "gateway"]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("dev");
    expect(res.argv).toEqual(["node", "brikko-studio", "gateway"]);
  });

  it("parses --profile value and strips it", () => {
    const res = parseCliProfileArgs(["node", "brikko-studio", "--profile", "work", "status"]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("work");
    expect(res.argv).toEqual(["node", "brikko-studio", "status"]);
  });

  it("parses interleaved --profile after the command token", () => {
    const res = parseCliProfileArgs(["node", "brikko-studio", "status", "--profile", "work", "--deep"]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("work");
    expect(res.argv).toEqual(["node", "brikko-studio", "status", "--deep"]);
  });

  it("preserves Matrix QA --profile for the command parser", () => {
    const res = parseCliProfileArgs([
      "node",
      "brikko-studio",
      "qa",
      "matrix",
      "--profile",
      "fast",
      "--fail-fast",
    ]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBeNull();
    expect(res.argv).toEqual([
      "node",
      "brikko-studio",
      "qa",
      "matrix",
      "--profile",
      "fast",
      "--fail-fast",
    ]);
  });

  it("preserves Matrix QA --profile after leading root options", () => {
    const res = parseCliProfileArgs([
      "node",
      "brikko-studio",
      "--no-color",
      "qa",
      "matrix",
      "--profile=fast",
    ]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBeNull();
    expect(res.argv).toEqual(["node", "brikko-studio", "--no-color", "qa", "matrix", "--profile=fast"]);
  });

  it("still parses root --profile before Matrix QA", () => {
    const res = parseCliProfileArgs([
      "node",
      "brikko-studio",
      "--profile",
      "work",
      "qa",
      "matrix",
      "--fail-fast",
    ]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("work");
    expect(res.argv).toEqual(["node", "brikko-studio", "qa", "matrix", "--fail-fast"]);
  });

  it("parses interleaved --dev after the command token", () => {
    const res = parseCliProfileArgs(["node", "brikko-studio", "status", "--dev"]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("dev");
    expect(res.argv).toEqual(["node", "brikko-studio", "status"]);
  });

  it("rejects missing profile value", () => {
    const res = parseCliProfileArgs(["node", "brikko-studio", "--profile"]);
    expect(res.ok).toBe(false);
  });

  it.each([
    ["--dev first", ["node", "brikko-studio", "--dev", "--profile", "work", "status"]],
    ["--profile first", ["node", "brikko-studio", "--profile", "work", "--dev", "status"]],
    ["interleaved after command", ["node", "brikko-studio", "status", "--profile", "work", "--dev"]],
  ])("rejects combining --dev with --profile (%s)", (_name, argv) => {
    const res = parseCliProfileArgs(argv);
    expect(res.ok).toBe(false);
  });
});

describe("applyCliProfileEnv", () => {
  it("fills env defaults for dev profile", () => {
    const env: Record<string, string | undefined> = {};
    applyCliProfileEnv({
      profile: "dev",
      env,
      homedir: () => "/home/peter",
    });
    const expectedStateDir = path.join(path.resolve("/home/peter"), ".brikko-studio-dev");
    expect(env.BRIKKO_STUDIO_PROFILE).toBe("dev");
    expect(env.BRIKKO_STUDIO_STATE_DIR).toBe(expectedStateDir);
    expect(env.BRIKKO_STUDIO_CONFIG_PATH).toBe(path.join(expectedStateDir, "brikko-studio.json"));
    expect(env.BRIKKO_STUDIO_GATEWAY_PORT).toBe("19001");
  });

  it("does not override explicit env values", () => {
    const env: Record<string, string | undefined> = {
      BRIKKO_STUDIO_STATE_DIR: "/custom",
      BRIKKO_STUDIO_GATEWAY_PORT: "19099",
    };
    applyCliProfileEnv({
      profile: "dev",
      env,
      homedir: () => "/home/peter",
    });
    expect(env.BRIKKO_STUDIO_STATE_DIR).toBe("/custom");
    expect(env.BRIKKO_STUDIO_GATEWAY_PORT).toBe("19099");
    expect(env.BRIKKO_STUDIO_CONFIG_PATH).toBe(path.join("/custom", "brikko-studio.json"));
  });

  it("uses BRIKKO_STUDIO_HOME when deriving profile state dir", () => {
    const env: Record<string, string | undefined> = {
      BRIKKO_STUDIO_HOME: "/srv/brikko-studio-home",
      HOME: "/home/other",
    };
    applyCliProfileEnv({
      profile: "work",
      env,
      homedir: () => "/home/fallback",
    });

    const resolvedHome = path.resolve("/srv/brikko-studio-home");
    expect(env.BRIKKO_STUDIO_STATE_DIR).toBe(path.join(resolvedHome, ".brikko-studio-work"));
    expect(env.BRIKKO_STUDIO_CONFIG_PATH).toBe(
      path.join(resolvedHome, ".brikko-studio-work", "brikko-studio.json"),
    );
  });
});

describe("formatCliCommand", () => {
  it.each([
    {
      name: "no profile is set",
      cmd: "brikko-studio doctor --fix",
      env: {},
      expected: "brikko-studio doctor --fix",
    },
    {
      name: "profile is default",
      cmd: "brikko-studio doctor --fix",
      env: { BRIKKO_STUDIO_PROFILE: "default" },
      expected: "brikko-studio doctor --fix",
    },
    {
      name: "profile is Default (case-insensitive)",
      cmd: "brikko-studio doctor --fix",
      env: { BRIKKO_STUDIO_PROFILE: "Default" },
      expected: "brikko-studio doctor --fix",
    },
    {
      name: "profile is invalid",
      cmd: "brikko-studio doctor --fix",
      env: { BRIKKO_STUDIO_PROFILE: "bad profile" },
      expected: "brikko-studio doctor --fix",
    },
    {
      name: "--profile is already present",
      cmd: "brikko-studio --profile work doctor --fix",
      env: { BRIKKO_STUDIO_PROFILE: "work" },
      expected: "brikko-studio --profile work doctor --fix",
    },
    {
      name: "--dev is already present",
      cmd: "brikko-studio --dev doctor",
      env: { BRIKKO_STUDIO_PROFILE: "dev" },
      expected: "brikko-studio --dev doctor",
    },
  ])("returns command unchanged when $name", ({ cmd, env, expected }) => {
    expect(formatCliCommand(cmd, env)).toBe(expected);
  });

  it("inserts --profile flag when profile is set", () => {
    expect(formatCliCommand("brikko-studio doctor --fix", { BRIKKO_STUDIO_PROFILE: "work" })).toBe(
      "brikko-studio --profile work doctor --fix",
    );
  });

  it("trims whitespace from profile", () => {
    expect(formatCliCommand("brikko-studio doctor --fix", { BRIKKO_STUDIO_PROFILE: "  jbbrikko-studio  " })).toBe(
      "brikko-studio --profile jbbrikko-studio doctor --fix",
    );
  });

  it("handles command with no args after brikko-studio", () => {
    expect(formatCliCommand("brikko-studio", { BRIKKO_STUDIO_PROFILE: "test" })).toBe(
      "brikko-studio --profile test",
    );
  });

  it("handles pnpm wrapper", () => {
    expect(formatCliCommand("pnpm brikko-studio doctor", { BRIKKO_STUDIO_PROFILE: "work" })).toBe(
      "pnpm brikko-studio --profile work doctor",
    );
  });

  it("inserts --container when a container hint is set", () => {
    expect(
      formatCliCommand("brikko-studio gateway status --deep", { BRIKKO_STUDIO_CONTAINER_HINT: "demo" }),
    ).toBe("brikko-studio --container demo gateway status --deep");
  });

  it("ignores unsafe container hints", () => {
    expect(
      formatCliCommand("brikko-studio gateway status --deep", {
        BRIKKO_STUDIO_CONTAINER_HINT: "demo; rm -rf /",
      }),
    ).toBe("brikko-studio gateway status --deep");
  });

  it("preserves both --container and --profile hints", () => {
    expect(
      formatCliCommand("brikko-studio doctor", {
        BRIKKO_STUDIO_CONTAINER_HINT: "demo",
        BRIKKO_STUDIO_PROFILE: "work",
      }),
    ).toBe("brikko-studio --container demo doctor");
  });

  it("does not prepend --container for update commands", () => {
    expect(formatCliCommand("brikko-studio update", { BRIKKO_STUDIO_CONTAINER_HINT: "demo" })).toBe(
      "brikko-studio update",
    );
    expect(
      formatCliCommand("pnpm brikko-studio update --channel beta", { BRIKKO_STUDIO_CONTAINER_HINT: "demo" }),
    ).toBe("pnpm brikko-studio update --channel beta");
  });
});
