import { describe, expect, it } from "vitest";
import { resolveBrikkoStudioToolsForMcp } from "./brikko-studio-tools-serve.js";
import { createPluginToolsMcpHandlers } from "./plugin-tools-handlers.js";

describe("BrikkoStudio tools MCP server", () => {
  it("does not expose owner-only cron", async () => {
    const handlers = createPluginToolsMcpHandlers(resolveBrikkoStudioToolsForMcp());

    const listed = await handlers.listTools();
    expect(listed.tools.map((tool) => tool.name)).not.toContain("cron");
  });

  it("blocks owner-only cron invocation", async () => {
    const handlers = createPluginToolsMcpHandlers(resolveBrikkoStudioToolsForMcp());

    const result = await handlers.callTool({ name: "cron", arguments: { action: "status" } });
    expect(result).toEqual({
      content: [{ type: "text", text: "Unknown tool: cron" }],
      isError: true,
    });
  });
});
