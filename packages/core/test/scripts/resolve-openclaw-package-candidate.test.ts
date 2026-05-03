import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  parseArgs,
  readArtifactPackageCandidateMetadata,
  validateBrikko StudioPackageSpec,
} from "../../scripts/resolve-brikko-studio-package-candidate.mjs";

describe("resolve-brikko-studio-package-candidate", () => {
  it("accepts only Brikko Studio release package specs for npm candidates", () => {
    expect(() => validateBrikko StudioPackageSpec("brikko-studio@beta")).not.toThrow();
    expect(() => validateBrikko StudioPackageSpec("brikko-studio@alpha")).not.toThrow();
    expect(() => validateBrikko StudioPackageSpec("brikko-studio@latest")).not.toThrow();
    expect(() => validateBrikko StudioPackageSpec("brikko-studio@2026.4.27")).not.toThrow();
    expect(() => validateBrikko StudioPackageSpec("brikko-studio@2026.4.27-1")).not.toThrow();
    expect(() => validateBrikko StudioPackageSpec("brikko-studio@2026.4.27-beta.2")).not.toThrow();
    expect(() => validateBrikko StudioPackageSpec("brikko-studio@2026.4.27-alpha.2")).not.toThrow();

    expect(() => validateBrikko StudioPackageSpec("@evil/brikko-studio@1.0.0")).toThrow(
      "package_spec must be brikko-studio@alpha",
    );
    expect(() => validateBrikko StudioPackageSpec("brikko-studio@canary")).toThrow(
      "package_spec must be brikko-studio@alpha",
    );
    expect(() => validateBrikko StudioPackageSpec("brikko-studio@2026.04.27")).toThrow(
      "package_spec must be brikko-studio@alpha",
    );
    expect(() => validateBrikko StudioPackageSpec("brikko-studio@npm:other-package")).toThrow(
      "package_spec must be brikko-studio@alpha",
    );
    expect(() => validateBrikko StudioPackageSpec("brikko-studio@file:../other-package.tgz")).toThrow(
      "package_spec must be brikko-studio@alpha",
    );
  });

  it("parses optional empty workflow inputs without rejecting the command line", () => {
    expect(
      parseArgs([
        "--source",
        "npm",
        "--package-ref",
        "release/2026.4.27",
        "--package-spec",
        "brikko-studio@beta",
        "--package-url",
        "",
        "--package-sha256",
        "",
        "--artifact-dir",
        ".",
        "--output-dir",
        ".artifacts/docker-e2e-package",
      ]),
    ).toMatchObject({
      artifactDir: ".",
      outputDir: ".artifacts/docker-e2e-package",
      packageSha256: "",
      packageRef: "release/2026.4.27",
      packageSpec: "brikko-studio@beta",
      packageUrl: "",
      source: "npm",
    });
  });

  it("reads package source metadata from package artifacts", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "brikko-studio-package-candidate-"));
    await writeFile(
      path.join(dir, "package-candidate.json"),
      JSON.stringify(
        {
          packageRef: "release/2026.4.30",
          packageSourceSha: "66ce632b9b7c5c7fdd3e66c739687d51638ad6e2",
          packageTrustedReason: "repository-branch-history",
          sha256: "a".repeat(64),
        },
        null,
        2,
      ),
    );

    await expect(readArtifactPackageCandidateMetadata(dir)).resolves.toMatchObject({
      packageRef: "release/2026.4.30",
      packageSourceSha: "66ce632b9b7c5c7fdd3e66c739687d51638ad6e2",
      packageTrustedReason: "repository-branch-history",
      sha256: "a".repeat(64),
    });
  });
});
