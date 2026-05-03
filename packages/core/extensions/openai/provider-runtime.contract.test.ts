import { describeOpenAIProviderRuntimeContract } from "brikko-studio/plugin-sdk/provider-test-contracts";

describeOpenAIProviderRuntimeContract(() => import("./index.js"));
