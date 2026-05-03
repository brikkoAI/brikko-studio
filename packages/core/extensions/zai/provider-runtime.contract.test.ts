import { describeZAIProviderRuntimeContract } from "brikko-studio/plugin-sdk/provider-test-contracts";

describeZAIProviderRuntimeContract(() => import("./index.js"));
