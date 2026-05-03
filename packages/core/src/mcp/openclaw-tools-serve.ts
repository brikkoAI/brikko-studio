/**
 * Standalone MCP server for selected built-in BrikkoStudio tools.
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

export function resolveBrikkoStudioToolsForMcp(): AnyAgentTool[] {
  return [createCronTool()];
}

function createBrikkoStudioToolsMcpServer(
  params: {
    tools?: AnyAgentTool[];
  } = {},
): Server {
  const tools = params.tools ?? resolveBrikkoStudioToolsForMcp();
  return createToolsMcpServer({ name: "brikko-studio-tools", tools });
}

async function serveBrikkoStudioToolsMcp(): Promise<void> {
  const server = createBrikkoStudioToolsMcpServer();
  await connectToolsMcpServerToStdio(server);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  serveBrikkoStudioToolsMcp().catch((err) => {
    process.stderr.write(`brikko-studio-tools-serve: ${formatErrorMessage(err)}\n`);
    process.exit(1);
  });
}
