import { describe, expect, it } from "vitest";
import {
  ensureBrikkoStudioExecMarkerOnProcess,
  markBrikkoStudioExecEnv,
  BRIKKO_STUDIO_CLI_ENV_VALUE,
  BRIKKO_STUDIO_CLI_ENV_VAR,
} from "./brikko-studio-exec-env.js";

describe("markBrikkoStudioExecEnv", () => {
  it("returns a cloned env object with the exec marker set", () => {
    const env = { PATH: "/usr/bin", BRIKKO_STUDIO_CLI: "0" };
    const marked = markBrikkoStudioExecEnv(env);

    expect(marked).toEqual({
      PATH: "/usr/bin",
      BRIKKO_STUDIO_CLI: BRIKKO_STUDIO_CLI_ENV_VALUE,
    });
    expect(marked).not.toBe(env);
    expect(env.BRIKKO_STUDIO_CLI).toBe("0");
  });
});

describe("ensureBrikkoStudioExecMarkerOnProcess", () => {
  it.each([
    {
      name: "mutates and returns the provided process env",
      env: { PATH: "/usr/bin" } as NodeJS.ProcessEnv,
    },
    {
      name: "overwrites an existing marker on the provided process env",
      env: { PATH: "/usr/bin", [BRIKKO_STUDIO_CLI_ENV_VAR]: "0" } as NodeJS.ProcessEnv,
    },
  ])("$name", ({ env }) => {
    expect(ensureBrikkoStudioExecMarkerOnProcess(env)).toBe(env);
    expect(env[BRIKKO_STUDIO_CLI_ENV_VAR]).toBe(BRIKKO_STUDIO_CLI_ENV_VALUE);
  });

  it("defaults to mutating process.env when no env object is provided", () => {
    const previous = process.env[BRIKKO_STUDIO_CLI_ENV_VAR];
    delete process.env[BRIKKO_STUDIO_CLI_ENV_VAR];

    try {
      expect(ensureBrikkoStudioExecMarkerOnProcess()).toBe(process.env);
      expect(process.env[BRIKKO_STUDIO_CLI_ENV_VAR]).toBe(BRIKKO_STUDIO_CLI_ENV_VALUE);
    } finally {
      if (previous === undefined) {
        delete process.env[BRIKKO_STUDIO_CLI_ENV_VAR];
      } else {
        process.env[BRIKKO_STUDIO_CLI_ENV_VAR] = previous;
      }
    }
  });
});
