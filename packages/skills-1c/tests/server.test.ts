import { describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/server.js";

const stubImpls = {
  documentsList: async () => [],
  contractorsSearch: async () => [],
  reportsBalance: async () => [],
};

describe("1С MCP server — handshake + tools/list", () => {
  it("responds to initialize and lists 3 tools", async () => {
    const server = createServer(stubImpls);
    const [c, s] = InMemoryTransport.createLinkedPair();
    await server.connect(s);

    const client = new Client(
      { name: "test-client", version: "0.0.0" },
      { capabilities: {} },
    );
    await client.connect(c);

    const tools = await client.listTools();
    expect(tools.tools.map((t) => t.name).sort()).toEqual([
      "1c.contractors.search",
      "1c.documents.list",
      "1c.reports.balance",
    ]);

    await client.close();
  });

  it("calls 1c.documents.list and returns the stub result", async () => {
    const server = createServer({
      ...stubImpls,
      documentsList: async () => [{ id: "doc-1", number: "00001" }],
    });
    const [c, s] = InMemoryTransport.createLinkedPair();
    await server.connect(s);
    const client = new Client(
      { name: "t", version: "0.0.0" },
      { capabilities: {} },
    );
    await client.connect(c);
    const res = await client.callTool({
      name: "1c.documents.list",
      arguments: { type: "sale", limit: 5 },
    });
    const content = res.content as Array<{ text: string }>;
    expect(JSON.parse(content[0]!.text)).toEqual([
      { id: "doc-1", number: "00001" },
    ]);
    await client.close();
  });
});
