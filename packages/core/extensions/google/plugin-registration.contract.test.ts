import { pluginRegistrationContractCases } from "brikko-studio/plugin-sdk/plugin-test-contracts";
import { describePluginRegistrationContract } from "brikko-studio/plugin-sdk/plugin-test-contracts";

describePluginRegistrationContract({
  ...pluginRegistrationContractCases.google,
  speechProviderIds: ["google"],
  videoGenerationProviderIds: ["google"],
  webSearchProviderIds: ["gemini"],
  requireDescribeImages: true,
  requireGenerateImage: true,
  requireGenerateVideo: true,
});
