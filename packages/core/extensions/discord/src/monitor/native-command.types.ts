import type { BrikkoStudioConfig } from "brikko-studio/plugin-sdk/config-types";
import type { CommandArgValues } from "brikko-studio/plugin-sdk/native-command-registry";

export type DiscordConfig = NonNullable<BrikkoStudioConfig["channels"]>["discord"];

export type DiscordCommandArgs = {
  raw?: string;
  values?: CommandArgValues;
};
