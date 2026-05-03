import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { syncPluginVersions } from "../../scripts/sync-plugin-versions.js";
import { cleanupTempDirs, makeTempDir } from "../../test/helpers/temp-dir.js";

const tempDirs: string[] = [];

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

describe("syncPluginVersions", () => {
  afterEach(() => {
    cleanupTempDirs(tempDirs);
  });

  it("preserves workspace brikko-studio devDependencies and plugin host floors", () => {
    const rootDir = makeTempDir(tempDirs, "brikko-studio-sync-plugin-versions-");

    writeJson(path.join(rootDir, "package.json"), {
      name: "brikko-studio",
      version: "2026.4.1",
    });
    writeJson(path.join(rootDir, "extensions/bluebubbles/package.json"), {
      name: "@brikko-studio/bluebubbles",
      version: "2026.3.30",
      devDependencies: {
        brikko-studio: "workspace:*",
      },
      peerDependencies: {
        brikko-studio: ">=2026.3.30",
      },
      brikko-studio: {
        install: {
          minHostVersion: ">=2026.3.30",
        },
        compat: {
          pluginApi: ">=2026.3.30",
        },
        build: {
          brikko-studioVersion: "2026.3.30",
        },
      },
    });

    const summary = syncPluginVersions(rootDir);
    const updatedPackage = JSON.parse(
      fs.readFileSync(path.join(rootDir, "extensions/bluebubbles/package.json"), "utf8"),
    ) as {
      version?: string;
      devDependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
      brikko-studio?: {
        install?: {
          minHostVersion?: string;
        };
        compat?: {
          pluginApi?: string;
        };
        build?: {
          brikko-studioVersion?: string;
        };
      };
    };

    expect(summary.updated).toContain("@brikko-studio/bluebubbles");
    expect(updatedPackage.version).toBe("2026.4.1");
    expect(updatedPackage.devDependencies?.brikko-studio).toBe("workspace:*");
    expect(updatedPackage.peerDependencies?.brikko-studio).toBe(">=2026.4.1");
    expect(updatedPackage.brikko-studio?.install?.minHostVersion).toBe(">=2026.3.30");
    expect(updatedPackage.brikko-studio?.compat?.pluginApi).toBe(">=2026.4.1");
    expect(updatedPackage.brikko-studio?.build?.brikko-studioVersion).toBe("2026.4.1");
  });

  it("reports pending version sync without writing in check mode", () => {
    const rootDir = makeTempDir(tempDirs, "brikko-studio-sync-plugin-versions-check-");

    writeJson(path.join(rootDir, "package.json"), {
      name: "brikko-studio",
      version: "2026.4.2",
    });
    writeJson(path.join(rootDir, "extensions/discord/package.json"), {
      name: "@brikko-studio/discord",
      version: "2026.4.1",
      peerDependencies: {
        brikko-studio: ">=2026.4.1",
      },
      brikko-studio: {
        compat: {
          pluginApi: ">=2026.4.1",
        },
      },
    });

    const summary = syncPluginVersions(rootDir, { write: false });
    const unchangedPackage = JSON.parse(
      fs.readFileSync(path.join(rootDir, "extensions/discord/package.json"), "utf8"),
    ) as {
      version?: string;
      peerDependencies?: Record<string, string>;
      brikko-studio?: {
        compat?: {
          pluginApi?: string;
        };
      };
    };

    expect(summary.updated).toEqual(["@brikko-studio/discord"]);
    expect(unchangedPackage.version).toBe("2026.4.1");
    expect(unchangedPackage.peerDependencies?.brikko-studio).toBe(">=2026.4.1");
    expect(unchangedPackage.brikko-studio?.compat?.pluginApi).toBe(">=2026.4.1");
  });
});
