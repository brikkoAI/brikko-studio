import type { BrikkoStudioConfig } from "brikko-studio/plugin-sdk/config-types";

export type WhatsAppAccountConfig = NonNullable<
  NonNullable<NonNullable<BrikkoStudioConfig["channels"]>["whatsapp"]>["accounts"]
>[string];
