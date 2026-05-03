import { describe, expect, it } from "vitest";
import {
  buildReadPermissions,
  normalizeRepo,
  parsePermissionKeys,
  parseRepoArg,
} from "../../scripts/gh-read.js";

describe("gh-read helpers", () => {
  it("finds repo from gh args", () => {
    expect(parseRepoArg(["pr", "view", "42", "-R", "brikko-studio/brikko-studio"])).toBe("brikko-studio/brikko-studio");
    expect(parseRepoArg(["run", "list", "--repo=brikko-studio/docs"])).toBe("brikko-studio/docs");
    expect(parseRepoArg(["pr", "view", "42"])).toBeNull();
  });

  it("normalizes repo strings from common git formats", () => {
    expect(normalizeRepo("brikko-studio/brikko-studio")).toBe("brikko-studio/brikko-studio");
    expect(normalizeRepo("github.com/brikko-studio/brikko-studio")).toBe("brikko-studio/brikko-studio");
    expect(normalizeRepo("https://github.com/brikko-studio/brikko-studio.git")).toBe("brikko-studio/brikko-studio");
    expect(normalizeRepo("git@github.com:brikko-studio/brikko-studio.git")).toBe("brikko-studio/brikko-studio");
    expect(normalizeRepo("invalid")).toBeNull();
  });

  it("builds a read-only permission subset from granted permissions", () => {
    expect(
      buildReadPermissions(
        {
          actions: "write",
          issues: "read",
          administration: "write",
          metadata: "read",
          statuses: null,
        },
        ["actions", "issues", "metadata", "statuses", "administration"],
      ),
    ).toEqual({
      administration: "read",
      actions: "read",
      issues: "read",
      metadata: "read",
    });
  });

  it("parses permission key overrides", () => {
    expect(parsePermissionKeys(undefined)).toContain("pull_requests");
    expect(parsePermissionKeys("actions, contents ,issues")).toEqual([
      "actions",
      "contents",
      "issues",
    ]);
  });
});
