import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { withTempDir } from "./test-helpers/temp-dir.js";
import {
  ensureDir,
  resolveConfigDir,
  resolveHomeDir,
  resolveUserPath,
  shortenHomeInString,
  shortenHomePath,
  sleep,
} from "./utils.js";

describe("ensureDir", () => {
  it("creates nested directory", async () => {
    await withTempDir({ prefix: "brikko-studio-test-" }, async (tmp) => {
      const target = path.join(tmp, "nested", "dir");
      await ensureDir(target);
      expect(fs.existsSync(target)).toBe(true);
    });
  });
});

describe("sleep", () => {
  it("resolves after delay using fake timers", async () => {
    vi.useFakeTimers();
    try {
      const promise = sleep(1000);
      vi.advanceTimersByTime(1000);
      await expect(promise).resolves.toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("resolveConfigDir", () => {
  it("prefers ~/.brikko-studio when legacy dir is missing", async () => {
    await withTempDir({ prefix: "brikko-studio-config-dir-" }, async (root) => {
      const newDir = path.join(root, ".brikko-studio");
      await fs.promises.mkdir(newDir, { recursive: true });
      const resolved = resolveConfigDir({} as NodeJS.ProcessEnv, () => root);
      expect(resolved).toBe(newDir);
    });
  });

  it("expands BRIKKO_STUDIO_STATE_DIR using the provided env", () => {
    const env = {
      HOME: "/tmp/brikko-studio-home",
      BRIKKO_STUDIO_STATE_DIR: "~/state",
    } as NodeJS.ProcessEnv;

    expect(resolveConfigDir(env)).toBe(path.resolve("/tmp/brikko-studio-home", "state"));
  });

  it("falls back to the config file directory when only BRIKKO_STUDIO_CONFIG_PATH is set", () => {
    const env = {
      HOME: "/tmp/brikko-studio-home",
      BRIKKO_STUDIO_CONFIG_PATH: "~/profiles/dev/brikko-studio.json",
    } as NodeJS.ProcessEnv;

    expect(resolveConfigDir(env)).toBe(path.resolve("/tmp/brikko-studio-home", "profiles", "dev"));
  });
});

describe("resolveHomeDir", () => {
  it("prefers BRIKKO_STUDIO_HOME over HOME", () => {
    vi.stubEnv("BRIKKO_STUDIO_HOME", "/srv/brikko-studio-home");
    vi.stubEnv("HOME", "/home/other");
    try {
      expect(resolveHomeDir()).toBe(path.resolve("/srv/brikko-studio-home"));
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe("shortenHomePath", () => {
  it("uses $BRIKKO_STUDIO_HOME prefix when BRIKKO_STUDIO_HOME is set", () => {
    vi.stubEnv("BRIKKO_STUDIO_HOME", "/srv/brikko-studio-home");
    vi.stubEnv("HOME", "/home/other");
    try {
      expect(shortenHomePath(`${path.resolve("/srv/brikko-studio-home")}/.brikko-studio/brikko-studio.json`)).toBe(
        "$BRIKKO_STUDIO_HOME/.brikko-studio/brikko-studio.json",
      );
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe("shortenHomeInString", () => {
  it("uses $BRIKKO_STUDIO_HOME replacement when BRIKKO_STUDIO_HOME is set", () => {
    vi.stubEnv("BRIKKO_STUDIO_HOME", "/srv/brikko-studio-home");
    vi.stubEnv("HOME", "/home/other");
    try {
      expect(
        shortenHomeInString(
          `config: ${path.resolve("/srv/brikko-studio-home")}/.brikko-studio/brikko-studio.json`,
        ),
      ).toBe("config: $BRIKKO_STUDIO_HOME/.brikko-studio/brikko-studio.json");
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe("resolveUserPath", () => {
  it("expands ~ to home dir", () => {
    expect(resolveUserPath("~", {}, () => "/Users/thoffman")).toBe(path.resolve("/Users/thoffman"));
  });

  it("expands ~/ to home dir", () => {
    expect(resolveUserPath("~/brikko-studio", {}, () => "/Users/thoffman")).toBe(
      path.resolve("/Users/thoffman", "brikko-studio"),
    );
  });

  it("resolves relative paths", () => {
    expect(resolveUserPath("tmp/dir")).toBe(path.resolve("tmp/dir"));
  });

  it("prefers BRIKKO_STUDIO_HOME for tilde expansion", () => {
    vi.stubEnv("BRIKKO_STUDIO_HOME", "/srv/brikko-studio-home");
    vi.stubEnv("HOME", "/home/other");
    try {
      expect(resolveUserPath("~/brikko-studio")).toBe(path.resolve("/srv/brikko-studio-home", "brikko-studio"));
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("uses the provided env for tilde expansion", () => {
    const env = {
      HOME: "/tmp/brikko-studio-home",
      BRIKKO_STUDIO_HOME: "/srv/brikko-studio-home",
    } as NodeJS.ProcessEnv;

    expect(resolveUserPath("~/brikko-studio", env)).toBe(path.resolve("/srv/brikko-studio-home", "brikko-studio"));
  });

  it("keeps blank paths blank", () => {
    expect(resolveUserPath("")).toBe("");
    expect(resolveUserPath("   ")).toBe("");
  });

  it("returns empty string for undefined/null input", () => {
    expect(resolveUserPath(undefined as unknown as string)).toBe("");
    expect(resolveUserPath(null as unknown as string)).toBe("");
  });
});
