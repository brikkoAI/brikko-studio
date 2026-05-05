#!/usr/bin/env node
import { runStdio } from "../dist/index.js";
import { documentsList } from "../dist/tools/documents.js";
import { contractorsSearch } from "../dist/tools/contractors.js";
import { reportsBalance } from "../dist/tools/reports.js";
import { OdataClient } from "../dist/odata-client.js";
import { defaultBackend, loadCredentials } from "../dist/credentials.js";

const creds = await loadCredentials(defaultBackend());
const client = new OdataClient(creds);

await runStdio({
  documentsList: (a) => documentsList(client, a),
  contractorsSearch: (a) => contractorsSearch(client, a),
  reportsBalance: (a) => reportsBalance(client, a),
}).catch((err) => {
  console.error("[brikko-mcp-1c] fatal:", err);
  process.exit(1);
});
