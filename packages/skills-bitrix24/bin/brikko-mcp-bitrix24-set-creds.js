#!/usr/bin/env node
/**
 * Helper CLI: save Bitrix24 credentials to the OS keychain.
 *
 *   brikko-mcp-bitrix24-set-creds <portalUrl> <webhookToken>
 *
 * Example:
 *   brikko-mcp-bitrix24-set-creds https://acme.bitrix24.ru 1/abc123def456
 */
import { defaultBackend, saveCredentials } from "../dist/credentials.js";

const [portalUrl, webhookToken] = process.argv.slice(2);
if (!portalUrl || !webhookToken) {
  console.error(
    "usage: brikko-mcp-bitrix24-set-creds <portalUrl> <webhookToken>",
  );
  process.exit(2);
}

await saveCredentials(defaultBackend(), { portalUrl, webhookToken });
console.log("Saved.");
