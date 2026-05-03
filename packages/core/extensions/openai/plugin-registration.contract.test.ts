import { pluginRegistrationContractCases } from "brikko-studio/plugin-sdk/plugin-test-contracts";
import { describePluginRegistrationContract } from "brikko-studio/plugin-sdk/plugin-test-contracts";

describePluginRegistrationContract({
  ...pluginRegistrationContractCases.openai,
  videoGenerationProviderIds: ["openai"],
  requireGenerateImage: true,
  requireGenerateVideo: true,
});
