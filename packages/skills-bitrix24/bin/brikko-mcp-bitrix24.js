#!/usr/bin/env node
import { runStdio } from "../dist/index.js";
import { CredentialsMissingError } from "../dist/errors.js";

// Real implementations come in Task 14-15. This bin starts up but tools throw
// CredentialsMissingError until the user configures Bitrix24 in Settings.
const stub = {
  dealsList: async () => {
    throw new CredentialsMissingError();
  },
  dealsGet: async () => {
    throw new CredentialsMissingError();
  },
  contactsSearch: async () => {
    throw new CredentialsMissingError();
  },
  leadsCreate: async () => {
    throw new CredentialsMissingError();
  },
};

runStdio(stub).catch((err) => {
  console.error("[brikko-mcp-bitrix24] fatal:", err);
  process.exit(1);
});
