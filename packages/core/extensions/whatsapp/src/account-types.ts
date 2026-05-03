import type { Brikko StudioConfig } from "brikko-studio/plugin-sdk/config-types";

export type WhatsAppAccountConfig = NonNullable<
  NonNullable<NonNullable<Brikko StudioConfig["channels"]>["whatsapp"]>["accounts"]
>[string];
