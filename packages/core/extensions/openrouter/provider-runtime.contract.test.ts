import { describeOpenRouterProviderRuntimeContract } from "brikko-studio/plugin-sdk/provider-test-contracts";

describeOpenRouterProviderRuntimeContract(() => import("./index.js"));
