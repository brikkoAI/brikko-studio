import type { ProviderWrapStreamFnContext } from "brikko-studio/plugin-sdk/plugin-entry";
import { createDeepSeekV4OpenAICompatibleThinkingWrapper } from "brikko-studio/plugin-sdk/provider-stream-shared";
import { isDeepSeekV4ModelRef } from "./models.js";

export function createDeepSeekV4ThinkingWrapper(
  baseStreamFn: ProviderWrapStreamFnContext["streamFn"],
  thinkingLevel: ProviderWrapStreamFnContext["thinkingLevel"],
): ProviderWrapStreamFnContext["streamFn"] {
  return createDeepSeekV4OpenAICompatibleThinkingWrapper({
    baseStreamFn,
    thinkingLevel,
    shouldPatchModel: isDeepSeekV4ModelRef,
  });
}
