import { describeVeniceProviderRuntimeContract } from "brikko-studio/plugin-sdk/provider-test-contracts";

describeVeniceProviderRuntimeContract(() => import("./index.js"));
