import { describePluginRegistrationContract } from "brikko-studio/plugin-sdk/plugin-test-contracts";

describePluginRegistrationContract({
  pluginId: "opencode",
  providerIds: ["opencode"],
  mediaUnderstandingProviderIds: ["opencode"],
  requireDescribeImages: true,
});
