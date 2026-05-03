import { describeGithubCopilotProviderAuthContract } from "brikko-studio/plugin-sdk/provider-test-contracts";

describeGithubCopilotProviderAuthContract(() => import("./index.js"));
