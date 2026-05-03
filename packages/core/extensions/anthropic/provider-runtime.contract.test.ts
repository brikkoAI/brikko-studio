import { describeAnthropicProviderRuntimeContract } from "brikko-studio/plugin-sdk/provider-test-contracts";

describeAnthropicProviderRuntimeContract(() => import("./index.js"));
