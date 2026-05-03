import { describe, expect, it } from "vitest";
import {
  isBrikkoStudioOwnerOnlyCoreToolName,
  BRIKKO_STUDIO_OWNER_ONLY_CORE_TOOL_NAMES,
} from "./tools/owner-only-tools.js";

describe("createBrikkoStudioTools owner authorization", () => {
  it("marks owner-only core tool names", () => {
    expect(BRIKKO_STUDIO_OWNER_ONLY_CORE_TOOL_NAMES).toEqual(["cron", "gateway", "nodes"]);
    expect(isBrikkoStudioOwnerOnlyCoreToolName("cron")).toBe(true);
    expect(isBrikkoStudioOwnerOnlyCoreToolName("gateway")).toBe(true);
    expect(isBrikkoStudioOwnerOnlyCoreToolName("nodes")).toBe(true);
  });

  it("keeps canvas non-owner-only", () => {
    expect(isBrikkoStudioOwnerOnlyCoreToolName("canvas")).toBe(false);
  });
});
