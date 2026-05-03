import { definePluginEntry } from "brikko-studio/plugin-sdk/plugin-entry";
import { registerAmazonBedrockPlugin } from "./register.sync.runtime.js";

export default definePluginEntry({
  id: "amazon-bedrock",
  name: "Amazon Bedrock Provider",
  description: "Bundled Amazon Bedrock provider policy plugin",
  register(api) {
    registerAmazonBedrockPlugin(api);
  },
});
