#!/usr/bin/env node
// Stub bin — real implementations wired in Task 18. Until then this exits
// immediately with OneCCredentialsMissingError if invoked.
import { runStdio } from "../dist/index.js";
import { OneCCredentialsMissingError } from "../dist/errors.js";

const stub = {
  documentsList: async () => {
    throw new OneCCredentialsMissingError();
  },
  contractorsSearch: async () => {
    throw new OneCCredentialsMissingError();
  },
  reportsBalance: async () => {
    throw new OneCCredentialsMissingError();
  },
};

runStdio(stub).catch((err) => {
  console.error("[brikko-mcp-1c] fatal:", err);
  process.exit(1);
});
