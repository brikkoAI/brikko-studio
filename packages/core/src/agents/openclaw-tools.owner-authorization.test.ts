import { describe, expect, it } from "vitest";
import {
  isBrikko StudioOwnerOnlyCoreToolName,
  BRIKKO_STUDIO_OWNER_ONLY_CORE_TOOL_NAMES,
} from "./tools/owner-only-tools.js";

describe("createBrikko StudioTools owner authorization", () => {
  it("marks owner-only core tool names", () => {
    expect(BRIKKO_STUDIO_OWNER_ONLY_CORE_TOOL_NAMES).toEqual(["cron", "gateway", "nodes"]);
    expect(isBrikko StudioOwnerOnlyCoreToolName("cron")).toBe(true);
    expect(isBrikko StudioOwnerOnlyCoreToolName("gateway")).toBe(true);
    expect(isBrikko StudioOwnerOnlyCoreToolName("nodes")).toBe(true);
  });

  it("keeps canvas non-owner-only", () => {
    expect(isBrikko StudioOwnerOnlyCoreToolName("canvas")).toBe(false);
  });
});
