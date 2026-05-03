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
    createBrikko StudioToolsOptions: vi.fn(),
    stubTool,
  };
});

vi.mock("./brikko-studio-tools.js", () => ({
  createBrikko StudioTools: (options: unknown) => {
    mocks.createBrikko StudioToolsOptions(options);
    return [mocks.stubTool("cron", true)];
  },
}));

import "./test-helpers/fast-bash-tools.js";
import "./test-helpers/fast-coding-tools.js";
import { createBrikko StudioCodingTools } from "./pi-tools.js";

describe("createBrikko StudioCodingTools cron scope", () => {
  beforeEach(() => {
    mocks.createBrikko StudioToolsOptions.mockClear();
  });

  it("scopes the cron owner-only runtime grant to self-removal", () => {
    const tools = createBrikko StudioCodingTools({
      trigger: "cron",
      jobId: "job-current",
      senderIsOwner: false,
      ownerOnlyToolAllowlist: ["cron"],
    });

    expect(tools.map((tool) => tool.name)).toContain("cron");
    expect(mocks.createBrikko StudioToolsOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        cronSelfRemoveOnlyJobId: "job-current",
      }),
    );
  });

  it("does not scope ordinary owner cron sessions", () => {
    createBrikko StudioCodingTools({
      trigger: "cron",
      jobId: "job-current",
      senderIsOwner: true,
    });

    expect(mocks.createBrikko StudioToolsOptions).toHaveBeenCalledWith(
      expect.not.objectContaining({
        cronSelfRemoveOnlyJobId: expect.any(String),
      }),
    );
  });
});
