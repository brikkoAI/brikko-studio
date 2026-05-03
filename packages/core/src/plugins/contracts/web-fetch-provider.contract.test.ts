import { describeWebFetchProviderContracts } from "brikko-studio/plugin-sdk/provider-test-contracts";
import { pluginRegistrationContractRegistry } from "./registry.js";

const webFetchProviderContractTests = pluginRegistrationContractRegistry.filter(
  (entry) => entry.webFetchProviderIds.length > 0,
);

for (const entry of webFetchProviderContractTests) {
  describeWebFetchProviderContracts(entry.pluginId);
}
