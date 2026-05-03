import { describeGoogleProviderRuntimeContract } from "brikko-studio/plugin-sdk/provider-test-contracts";

describeGoogleProviderRuntimeContract(() => import("./index.js"));
