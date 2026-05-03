import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { cleanupTempDirs, makeTempDir } from "../test/helpers/temp-dir.js";
import {
  buildBrikkoStudioCompileCacheRespawnPlan,
  isSourceCheckoutInstallRoot,
  resolveBrikkoStudioCompileCacheDirectory,
  resolveEntryInstallRoot,
  shouldEnableBrikkoStudioCompileCache,
} from "./entry.compile-cache.js";

describe("entry compile cache", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    cleanupTempDirs(tempDirs);
  });

  it("resolves install roots from source and dist entry paths", () => {
    expect(resolveEntryInstallRoot("/repo/brikko-studio/src/entry.ts")).toBe("/repo/brikko-studio");
    expect(resolveEntryInstallRoot("/repo/brikko-studio/dist/entry.js")).toBe("/repo/brikko-studio");
    expect(resolveEntryInstallRoot("/pkg/brikko-studio/entry.js")).toBe("/pkg/brikko-studio");
  });

  it("treats git and source entry markers as source checkouts", async () => {
    const root = makeTempDir(tempDirs, "brikko-studio-compile-cache-source-");
    await fs.writeFile(path.join(root, ".git"), "gitdir: .git/worktrees/brikko-studio\n", "utf8");

    expect(isSourceCheckoutInstallRoot(root)).toBe(true);
  });

  it("disables compile cache for source-checkout installs", async () => {
    const root = makeTempDir(tempDirs, "brikko-studio-compile-cache-src-entry-");
    await fs.mkdir(path.join(root, "src"), { recursive: true });
    await fs.writeFile(path.join(root, "src", "entry.ts"), "export {};\n", "utf8");

    expect(
      shouldEnableBrikkoStudioCompileCache({
        env: {},
        installRoot: root,
      }),
    ).toBe(false);
  });

  it("keeps compile cache enabled for packaged installs unless disabled by env", () => {
    const root = makeTempDir(tempDirs, "brikko-studio-compile-cache-package-");

    expect(shouldEnableBrikkoStudioCompileCache({ env: {}, installRoot: root })).toBe(true);
    expect(
      shouldEnableBrikkoStudioCompileCache({
        env: { NODE_DISABLE_COMPILE_CACHE: "1" },
        installRoot: root,
      }),
    ).toBe(false);
  });

  it("scopes packaged compile cache by package install metadata", async () => {
    const root = makeTempDir(tempDirs, "brikko-studio-compile-cache-package-key-");
    const packageJsonPath = path.join(root, "package.json");
    await fs.writeFile(packageJsonPath, '{"version":"2026.4.29"}\n', "utf8");

    const directory = resolveBrikkoStudioCompileCacheDirectory({
      env: { NODE_COMPILE_CACHE: path.join(root, ".node-cache") },
      installRoot: root,
    });

    expect(directory).toContain(path.join(".node-cache", "brikko-studio"));
    expect(directory).toContain("2026.4.29");
    expect(path.basename(directory)).toMatch(/^\d+-\d+$/);
  });

  it("builds a one-shot no-cache respawn plan when source checkout inherits NODE_COMPILE_CACHE", async () => {
    const root = makeTempDir(tempDirs, "brikko-studio-compile-cache-respawn-");
    await fs.mkdir(path.join(root, "src"), { recursive: true });
    await fs.writeFile(path.join(root, "src", "entry.ts"), "export {};\n", "utf8");

    const plan = buildBrikkoStudioCompileCacheRespawnPlan({
      currentFile: path.join(root, "dist", "entry.js"),
      env: { NODE_COMPILE_CACHE: "/tmp/brikko-studio-cache" },
      execArgv: ["--no-warnings"],
      execPath: "/usr/bin/node",
      installRoot: root,
      argv: ["/usr/bin/node", path.join(root, "dist", "entry.js"), "status", "--json"],
    });

    expect(plan).toEqual({
      command: "/usr/bin/node",
      args: ["--no-warnings", path.join(root, "dist", "entry.js"), "status", "--json"],
      env: {
        NODE_DISABLE_COMPILE_CACHE: "1",
        BRIKKO_STUDIO_SOURCE_COMPILE_CACHE_RESPAWNED: "1",
      },
    });
  });

  it("does not respawn packaged installs when NODE_COMPILE_CACHE is configured", () => {
    const root = makeTempDir(tempDirs, "brikko-studio-compile-cache-package-respawn-");

    expect(
      buildBrikkoStudioCompileCacheRespawnPlan({
        currentFile: path.join(root, "dist", "entry.js"),
        env: { NODE_COMPILE_CACHE: "/tmp/brikko-studio-cache" },
        installRoot: root,
      }),
    ).toBeUndefined();
  });

  it("does not respawn source checkouts twice", async () => {
    const root = makeTempDir(tempDirs, "brikko-studio-compile-cache-respawn-once-");
    await fs.mkdir(path.join(root, "src"), { recursive: true });
    await fs.writeFile(path.join(root, "src", "entry.ts"), "export {};\n", "utf8");

    expect(
      buildBrikkoStudioCompileCacheRespawnPlan({
        currentFile: path.join(root, "dist", "entry.js"),
        env: {
          NODE_COMPILE_CACHE: "/tmp/brikko-studio-cache",
          BRIKKO_STUDIO_SOURCE_COMPILE_CACHE_RESPAWNED: "1",
        },
        installRoot: root,
      }),
    ).toBeUndefined();
  });
});
