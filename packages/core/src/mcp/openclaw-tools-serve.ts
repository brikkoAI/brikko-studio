/**
 * Standalone MCP server for selected built-in Brikko Studio tools.
 *
 * Run via: node --import tsx src/mcp/brikko-studio-tools-serve.ts
 * Or: bun src/mcp/brikko-studio-tools-serve.ts
 */
import { pathToFileURL } from "node:url";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import type { AnyAgentTool } from "../agents/tools/common.js";
import { createCronTool } from "../agents/tools/cron-tool.js";
import { formatErrorMessage } from "../infra/errors.js";
import { connectToolsMcpServerToStdio, createToolsMcpServer } from "./tools-stdio-server.js";

export function resolveBrikko StudioToolsForMcp(): AnyAgentTool[] {
  return [createCronTool()];
}

function createBrikko StudioToolsMcpServer(
  params: {
    tools?: AnyAgentTool[];
  } = {},
): Server {
  const tools = params.tools ?? resolveBrikko StudioToolsForMcp();
  return createToolsMcpServer({ name: "brikko-studio-tools", tools });
}

async function serveBrikko StudioToolsMcp(): Promise<void> {
  const server = createBrikko StudioToolsMcpServer();
  await connectToolsMcpServerToStdio(server);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  serveBrikko StudioToolsMcp().catch((err) => {
    process.stderr.write(`brikko-studio-tools-serve: ${formatErrorMessage(err)}\n`);
    process.exit(1);
  });
}
