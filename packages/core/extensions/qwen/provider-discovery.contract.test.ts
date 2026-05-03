import { describeModelStudioProviderDiscoveryContract } from "brikko-studio/plugin-sdk/provider-test-contracts";

describeModelStudioProviderDiscoveryContract(() => import("./index.js"));
