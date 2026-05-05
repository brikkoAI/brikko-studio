#!/usr/bin/env node
/**
 * Helper CLI: save 1С credentials to the OS keychain.
 *
 *   brikko-mcp-1c-set-creds <odataUrl> <username> <password>
 *
 * Example:
 *   brikko-mcp-1c-set-creds \
 *     https://1c.acme.ru/InfoBase/odata/standard.odata \
 *     brikko_studio \
 *     'p@ssw0rd'
 */
import { defaultBackend, saveCredentials } from "../dist/credentials.js";

const [odataUrl, username, password] = process.argv.slice(2);
if (!odataUrl || !username || !password) {
  console.error(
    "usage: brikko-mcp-1c-set-creds <odataUrl> <username> <password>",
  );
  process.exit(2);
}

await saveCredentials(defaultBackend(), { odataUrl, username, password });
console.log("Saved.");
