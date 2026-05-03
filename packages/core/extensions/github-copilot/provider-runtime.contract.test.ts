import { describeGithubCopilotProviderRuntimeContract } from "brikko-studio/plugin-sdk/provider-test-contracts";

describeGithubCopilotProviderRuntimeContract(() => import("./index.js"));
