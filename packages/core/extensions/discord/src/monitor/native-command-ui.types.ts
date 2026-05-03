import type { Brikko StudioConfig } from "brikko-studio/plugin-sdk/config-types";
import type { ThreadBindingManager } from "./thread-bindings.js";

type DiscordConfig = NonNullable<Brikko StudioConfig["channels"]>["discord"];

export type DiscordCommandArgContext = {
  cfg: Brikko StudioConfig;
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
