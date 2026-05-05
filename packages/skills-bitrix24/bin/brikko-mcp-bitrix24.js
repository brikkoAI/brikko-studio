#!/usr/bin/env node
import { runStdio } from "../dist/index.js";
import { dealsGet, dealsList } from "../dist/tools/deals.js";
import { contactsSearch } from "../dist/tools/contacts.js";
import { leadsCreate } from "../dist/tools/leads.js";
import { CrestClient } from "../dist/rest-client.js";
import { defaultBackend, loadCredentials } from "../dist/credentials.js";

const creds = await loadCredentials(defaultBackend());
const client = new CrestClient(creds);

await runStdio({
  dealsList: (a) => dealsList(client, a),
  dealsGet: (a) => dealsGet(client, a),
  contactsSearch: (a) => contactsSearch(client, a),
  leadsCreate: (a) => leadsCreate(client, a),
}).catch((err) => {
  console.error("[brikko-mcp-bitrix24] fatal:", err);
  process.exit(1);
});
