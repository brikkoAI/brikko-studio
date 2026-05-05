import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import {
  ContractorsSearchInput,
  DocumentsListInput,
  ReportsBalanceInput,
} from "./schemas.js";

const SERVER_INFO = { name: "brikko-1c", version: "0.3.0" };

export interface ToolImplementations {
  documentsList(args: z.infer<typeof DocumentsListInput>): Promise<unknown>;
  contractorsSearch(
    args: z.infer<typeof ContractorsSearchInput>,
  ): Promise<unknown>;
  reportsBalance(args: z.infer<typeof ReportsBalanceInput>): Promise<unknown>;
}

export function createServer(impls: ToolImplementations): Server {
  const server = new Server(SERVER_INFO, { capabilities: { tools: {} } });

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "1c.documents.list",
        description:
          "List 1С documents (sale/purchase/payment_in/payment_out) for a period.",
        inputSchema: zodToJsonSchema(DocumentsListInput),
      },
      {
        name: "1c.contractors.search",
        description: "Search 1С contractors by INN or name substring.",
        inputSchema: zodToJsonSchema(ContractorsSearchInput),
      },
      {
        name: "1c.reports.balance",
        description: "Fetch the accounting balance snapshot.",
        inputSchema: zodToJsonSchema(ReportsBalanceInput),
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    switch (req.params.name) {
      case "1c.documents.list":
        return jsonResult(
          await impls.documentsList(
            DocumentsListInput.parse(req.params.arguments ?? {}),
          ),
        );
      case "1c.contractors.search":
        return jsonResult(
          await impls.contractorsSearch(
            ContractorsSearchInput.parse(req.params.arguments ?? {}),
          ),
        );
      case "1c.reports.balance":
        return jsonResult(
          await impls.reportsBalance(
            ReportsBalanceInput.parse(req.params.arguments ?? {}),
          ),
        );
      default:
        throw new Error(`unknown tool: ${req.params.name}`);
    }
  });

  return server;
}

export async function runStdio(impls: ToolImplementations): Promise<void> {
  const server = createServer(impls);
  await server.connect(new StdioServerTransport());
}

function jsonResult(payload: unknown) {
  return {
    content: [
      { type: "text" as const, text: JSON.stringify(payload, null, 2) },
    ],
  };
}

/**
 * Inline minimal zod-to-json-schema. Sufficient for our schemas. If a future
 * schema breaks this shim, swap to the official `zod-to-json-schema` package.
 * Handles ZodObject, ZodEffects (`.refine()`), enums, optional, default.
 */
function zodToJsonSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  const def = (
    schema as unknown as {
      _def: {
        typeName: string;
        shape?: () => Record<string, z.ZodTypeAny>;
      };
    }
  )._def;
  if (def.typeName === "ZodObject" || def.typeName === "ZodEffects") {
    const inner =
      def.typeName === "ZodEffects"
        ? (schema as unknown as { _def: { schema: z.ZodTypeAny } })._def.schema
        : schema;
    const innerDef = (
      inner as unknown as {
        _def: { shape: () => Record<string, z.ZodTypeAny> };
      }
    )._def;
    const shape = innerDef.shape();
    const properties: Record<string, unknown> = {};
    const required: string[] = [];
    for (const [k, v] of Object.entries(shape)) {
      properties[k] = leafSchema(v);
      const isOptional =
        (v as unknown as { isOptional: () => boolean }).isOptional?.() === true;
      if (!isOptional) required.push(k);
    }
    return {
      type: "object",
      properties,
      required,
      additionalProperties: false,
    };
  }
  return leafSchema(schema);
}

function leafSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  const def = (schema as unknown as { _def: { typeName: string } })._def;
  switch (def.typeName) {
    case "ZodString":
      return { type: "string" };
    case "ZodNumber":
      return { type: "number" };
    case "ZodBoolean":
      return { type: "boolean" };
    case "ZodEnum":
      return {
        type: "string",
        enum: (schema as unknown as { _def: { values: string[] } })._def.values,
      };
    case "ZodOptional":
    case "ZodDefault":
      return leafSchema(
        (schema as unknown as { _def: { innerType: z.ZodTypeAny } })._def
          .innerType,
      );
    default:
      return { type: "string" };
  }
}
