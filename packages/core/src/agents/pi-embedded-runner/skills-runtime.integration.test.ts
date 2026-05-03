import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { Brikko StudioConfig } from "../../config/config.js";
import { writePluginWithSkill } from "../test-helpers/skill-plugin-fixtures.js";
import { resolveEmbeddedRunSkillEntries } from "./skills-runtime.js";

const tempDirs: string[] = [];
const originalBundledDir = process.env.BRIKKO_STUDIO_BUNDLED_PLUGINS_DIR;

function restoreBundledPluginsDir() {
  if (originalBundledDir === undefined) {
    delete process.env.BRIKKO_STUDIO_BUNDLED_PLUGINS_DIR;
    return;
  }
  process.env.BRIKKO_STUDIO_BUNDLED_PLUGINS_DIR = originalBundledDir;
}

async function createTempDir(prefix: string) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

async function setupBundledDiffsPlugin() {
  const bundledPluginsDir = await createTempDir("brikko-studio-bundled-");
  const workspaceDir = await createTempDir("brikko-studio-workspace-");
  const pluginRoot = path.join(bundledPluginsDir, "diffs");

  await writePluginWithSkill({
    pluginRoot,
    pluginId: "diffs",
    skillId: "diffs",
    skillDescription: "runtime integration test",
  });

  return { bundledPluginsDir, workspaceDir };
}

async function resolveBundledDiffsSkillEntries(config?: Brikko StudioConfig) {
  const { bundledPluginsDir, workspaceDir } = await setupBundledDiffsPlugin();
  process.env.BRIKKO_STUDIO_BUNDLED_PLUGINS_DIR = bundledPluginsDir;

  return resolveEmbeddedRunSkillEntries({ workspaceDir, ...(config ? { config } : {}) });
}

afterEach(async () => {
  restoreBundledPluginsDir();
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("resolveEmbeddedRunSkillEntries (integration)", () => {
  it("loads bundled diffs skill when explicitly enabled in config", async () => {
    const config: Brikko StudioConfig = {
      plugins: {
        entries: {
          diffs: { enabled: true },
        },
      },
    };

    const result = await resolveBundledDiffsSkillEntries(config);

    expect(result.shouldLoadSkillEntries).toBe(true);
    expect(result.skillEntries.map((entry) => entry.skill.name)).toContain("diffs");
  });

  it("skips bundled diffs skill when config is missing", async () => {
    const result = await resolveBundledDiffsSkillEntries();

    expect(result.shouldLoadSkillEntries).toBe(true);
    expect(result.skillEntries.map((entry) => entry.skill.name)).not.toContain("diffs");
  });
});
