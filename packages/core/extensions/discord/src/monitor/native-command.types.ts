import type { Brikko StudioConfig } from "brikko-studio/plugin-sdk/config-types";
import type { CommandArgValues } from "brikko-studio/plugin-sdk/native-command-registry";

export type DiscordConfig = NonNullable<Brikko StudioConfig["channels"]>["discord"];

export type DiscordCommandArgs = {
  raw?: string;
  values?: CommandArgValues;
};
