import { describePluginRegistrationContract } from "brikko-studio/plugin-sdk/plugin-test-contracts";

describePluginRegistrationContract({
  pluginId: "nvidia",
  providerIds: ["nvidia"],
  manifestAuthChoice: {
    pluginId: "nvidia",
    choiceId: "nvidia-api-key",
    choiceLabel: "NVIDIA API key",
    groupId: "nvidia",
    groupLabel: "NVIDIA",
    groupHint: "Direct API key",
  },
});
