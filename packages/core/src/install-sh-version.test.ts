import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { cleanupTempDirs, makeTempDir } from "../test/helpers/temp-dir.js";

const tempRoots: string[] = [];
const installerPath = path.join(process.cwd(), "scripts", "install.sh");
const installerSource = fs.readFileSync(installerPath, "utf-8");
const versionHelperStart = installerSource.indexOf("load_install_version_helpers() {");
const versionHelperEnd = installerSource.indexOf("\nis_gateway_daemon_loaded() {");

if (versionHelperStart < 0 || versionHelperEnd < 0) {
  throw new Error("install.sh version helper block not found");
}

const versionHelperSource = installerSource.slice(versionHelperStart, versionHelperEnd);

function resolveInstallerVersionCases(params: { stdinCwd: string }): string[] {
  const output = execFileSync(
    "bash",
    [
      "-c",
      `${versionHelperSource}
fake_brikko-studio_decorated() { printf '%s\\n' 'Brikko Studio 2026.3.10 (abcdef0)'; }
fake_brikko-studio_raw() { printf '%s\\n' "Brikko Studio dev's build"; }
BRIKKO_STUDIO_BIN=fake_brikko-studio_decorated resolve_brikko-studio_version
BRIKKO_STUDIO_BIN=fake_brikko-studio_raw resolve_brikko-studio_version
(
  cd "$1"
  source /dev/stdin <<'BRIKKO_STUDIO_STDIN_INSTALLER'
${versionHelperSource}
fake_brikko-studio_stdin() { printf '%s\\n' 'Brikko Studio 2026.3.10 (abcdef0)'; }
BRIKKO_STUDIO_BIN=fake_brikko-studio_stdin
resolve_brikko-studio_version
BRIKKO_STUDIO_STDIN_INSTALLER
)`,
      "brikko-studio-version-test",
      params.stdinCwd,
    ],
    {
      cwd: process.cwd(),
      encoding: "utf-8",
      env: {
        ...process.env,
        BRIKKO_STUDIO_INSTALL_SH_NO_RUN: "1",
      },
    },
  );
  return output.trimEnd().split("\n");
}

describe("install.sh version resolution", () => {
  afterEach(() => {
    cleanupTempDirs(tempRoots);
  });

  it.runIf(process.platform !== "win32")(
    "parses CLI versions and keeps stdin helpers isolated from cwd",
    () => {
      const hostileCwd = makeTempDir(tempRoots, "brikko-studio-install-stdin-");
      const hostileHelper = path.join(
        hostileCwd,
        "docker",
        "install-sh-common",
        "version-parse.sh",
      );
      fs.mkdirSync(path.dirname(hostileHelper), { recursive: true });
      fs.writeFileSync(
        hostileHelper,
        `#!/usr/bin/env bash
extract_brikko-studio_semver() {
  printf '%s' 'poisoned'
}
`,
        "utf-8",
      );

      expect(
        resolveInstallerVersionCases({
          stdinCwd: hostileCwd,
        }),
      ).toEqual(["2026.3.10", "Brikko Studio dev's build", "2026.3.10"]);
    },
  );
});
