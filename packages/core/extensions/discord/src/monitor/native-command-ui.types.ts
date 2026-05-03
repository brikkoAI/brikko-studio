import type { BrikkoStudioConfig } from "brikko-studio/plugin-sdk/config-types";
import type { ThreadBindingManager } from "./thread-bindings.js";

type DiscordConfig = NonNullable<BrikkoStudioConfig["channels"]>["discord"];

export type DiscordCommandArgContext = {
  cfg: BrikkoStudioConfig;
  discordConfig: DiscordConfig;
  accountId: string;
  sessionPrefix: string;
  threadBindings: ThreadBindingManager;
  postApplySettleMs?: number;
};

export type DiscordModelPickerContext = DiscordCommandArgContext;

export type SafeDiscordInteractionCall = <T>(
  label: string,
  fn: () => Promise<T>,
) => Promise<T | null>;
