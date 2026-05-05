import { describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../../src/server.js";

const stubImpls = {
  dealsList: async () => [],
  dealsGet: async () => null,
  contactsSearch: async () => [],
  leadsCreate: async () => ({ id: "lead_test" }),
};

describe("Bitrix24 MCP server — handshake + tools/list", () => {
  it("responds to initialize and lists 4 tools", async () => {
    const server = createServer(stubImpls);
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);

    const client = new Client(
      { name: "test-client", version: "0.0.0" },
      { capabilities: {} },
    );
    await client.connect(clientTransport);

    const tools = await client.listTools();
    expect(tools.tools.map((t) => t.name).sort()).toEqual([
      "bitrix24.contacts.search",
      "bitrix24.deals.get",
      "bitrix24.deals.list",
      "bitrix24.leads.create",
    ]);

    await client.close();
  });

  it("calls bitrix24.deals.list and returns the stub result", async () => {
    const server = createServer({
      ...stubImpls,
      dealsList: async () => [{ id: "d1", title: "Test" }],
    });
    const [c, s] = InMemoryTransport.createLinkedPair();
    await server.connect(s);
    const client = new Client(
      { name: "t", version: "0.0.0" },
      { capabilities: {} },
    );
    await client.connect(c);
    const res = await client.callTool({
      name: "bitrix24.deals.list",
      arguments: { limit: 5 },
    });
    const content = res.content as Array<{ text: string }>;
    expect(JSON.parse(content[0]!.text)).toEqual([
      { id: "d1", title: "Test" },
    ]);
    await client.close();
  });
});
