import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import {
  ContactsSearchInput,
  DealsGetInput,
  DealsListInput,
  LeadsCreateInput,
} from "./schemas.js";

const SERVER_INFO = { name: "brikko-bitrix24", version: "0.3.0" };

export interface ToolImplementations {
  dealsList(args: z.infer<typeof DealsListInput>): Promise<unknown>;
  dealsGet(args: z.infer<typeof DealsGetInput>): Promise<unknown>;
  contactsSearch(args: z.infer<typeof ContactsSearchInput>): Promise<unknown>;
  leadsCreate(args: z.infer<typeof LeadsCreateInput>): Promise<unknown>;
}

export function createServer(impls: ToolImplementations): Server {
  const server = new Server(SERVER_INFO, { capabilities: { tools: {} } });

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "bitrix24.deals.list",
        description:
          "List deals from Bitrix24 CRM, optionally filtered by client name and period.",
        inputSchema: zodToJsonSchema(DealsListInput),
      },
      {
        name: "bitrix24.deals.get",
        description: "Fetch a single deal by id.",
        inputSchema: zodToJsonSchema(DealsGetInput),
      },
      {
        name: "bitrix24.contacts.search",
        description: "Search contacts by name, phone, or email substring.",
        inputSchema: zodToJsonSchema(ContactsSearchInput),
      },
      {
        name: "bitrix24.leads.create",
        description:
          "Create a new lead in Bitrix24 with title and contact details.",
        inputSchema: zodToJsonSchema(LeadsCreateInput),
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    switch (req.params.name) {
      case "bitrix24.deals.list":
        return jsonResult(
          await impls.dealsList(
            DealsListInput.parse(req.params.arguments ?? {}),
          ),
        );
      case "bitrix24.deals.get":
        return jsonResult(
          await impls.dealsGet(DealsGetInput.parse(req.params.arguments ?? {})),
        );
      case "bitrix24.contacts.search":
        return jsonResult(
          await impls.contactsSearch(
            ContactsSearchInput.parse(req.params.arguments ?? {}),
          ),
        );
      case "bitrix24.leads.create":
        return jsonResult(
          await impls.leadsCreate(
            LeadsCreateInput.parse(req.params.arguments ?? {}),
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
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

function jsonResult(payload: unknown) {
  return {
    content: [
      { type: "text" as const, text: JSON.stringify(payload, null, 2) },
    ],
  };
}

/**
 * Inline minimal zod-to-json-schema. Sufficient for our schemas
 * (object with string/number/enum fields). Swap for the official
 * `zod-to-json-schema` package if a future schema breaks this shim.
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
  if (def.typeName === "ZodObject") {
    const shape = def.shape!();
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
