import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readLoggingConfig } from "./config.js";

const originalArgv = process.argv;
const originalConfigPath = process.env.BRIKKO_STUDIO_CONFIG_PATH;
let tempDirs: string[] = [];

function writeConfig(source: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "brikko-studio-logging-config-"));
  tempDirs.push(dir);
  const configPath = path.join(dir, "brikko-studio.json");
  fs.writeFileSync(configPath, source);
  process.env.BRIKKO_STUDIO_CONFIG_PATH = configPath;
  return configPath;
}

describe("readLoggingConfig", () => {
  afterEach(() => {
    process.argv = originalArgv;
    if (originalConfigPath === undefined) {
      delete process.env.BRIKKO_STUDIO_CONFIG_PATH;
    } else {
      process.env.BRIKKO_STUDIO_CONFIG_PATH = originalConfigPath;
    }
    for (const dir of tempDirs) {
      fs.rmSync(dir, { force: true, recursive: true });
    }
    tempDirs = [];
  });

  it("skips mutating config loads for config schema", async () => {
    process.argv = ["node", "brikko-studio", "config", "schema"];
    const configPath = writeConfig(`{ logging: { file: "/tmp/should-not-read.log" } }`);
    fs.rmSync(configPath);

    expect(readLoggingConfig()).toBeUndefined();
  });

  it("reads logging config directly from the active config path", () => {
    writeConfig(`{
      logging: {
        level: "debug",
        file: "/tmp/brikko-studio-custom.log",
        maxFileBytes: 1234,
      },
    }`);

    expect(readLoggingConfig()).toMatchObject({
      level: "debug",
      file: "/tmp/brikko-studio-custom.log",
      maxFileBytes: 1234,
    });
  });

  it("supports JSON5 comments and trailing commas", () => {
    writeConfig(`{
      // users commonly keep comments in brikko-studio.json
      logging: {
        consoleLevel: "warn",
      },
    }`);

    expect(readLoggingConfig()).toMatchObject({
      consoleLevel: "warn",
    });
  });

  it("returns undefined for missing or malformed config files", () => {
    process.env.BRIKKO_STUDIO_CONFIG_PATH = path.join(os.tmpdir(), "brikko-studio-missing-config.json");
    expect(readLoggingConfig()).toBeUndefined();

    writeConfig(`{ logging: `);
    expect(readLoggingConfig()).toBeUndefined();
  });
});
