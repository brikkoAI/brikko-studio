import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnyAgentTool } from "./tools/common.js";

const mocks = vi.hoisted(() => {
  const stubTool = (name: string, ownerOnly = false) =>
    ({
      name,
      label: name,
      displaySummary: name,
      description: name,
      ownerOnly,
      parameters: { type: "object", properties: {} },
      execute: vi.fn(),
    }) satisfies AnyAgentTool;

  return {
    createBrikkoStudioToolsOptions: vi.fn(),
    stubTool,
  };
});

vi.mock("./brikko-studio-tools.js", () => ({
  createBrikkoStudioTools: (options: unknown) => {
    mocks.createBrikkoStudioToolsOptions(options);
    return [mocks.stubTool("cron", true)];
  },
}));

import "./test-helpers/fast-bash-tools.js";
import "./test-helpers/fast-coding-tools.js";
import { createBrikkoStudioCodingTools } from "./pi-tools.js";

describe("createBrikkoStudioCodingTools cron scope", () => {
  beforeEach(() => {
    mocks.createBrikkoStudioToolsOptions.mockClear();
  });

  it("scopes the cron owner-only runtime grant to self-removal", () => {
    const tools = createBrikkoStudioCodingTools({
      trigger: "cron",
      jobId: "job-current",
      senderIsOwner: false,
      ownerOnlyToolAllowlist: ["cron"],
    });

    expect(tools.map((tool) => tool.name)).toContain("cron");
    expect(mocks.createBrikkoStudioToolsOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        cronSelfRemoveOnlyJobId: "job-current",
      }),
    );
  });

  it("does not scope ordinary owner cron sessions", () => {
    createBrikkoStudioCodingTools({
      trigger: "cron",
      jobId: "job-current",
      senderIsOwner: true,
    });

    expect(mocks.createBrikkoStudioToolsOptions).toHaveBeenCalledWith(
      expect.not.objectContaining({
        cronSelfRemoveOnlyJobId: expect.any(String),
      }),
    );
  });
});
