import type { Brikko StudioConfig } from "../config/types.brikko-studio.js";

export function isGatewayModelPricingEnabled(config: Brikko StudioConfig): boolean {
  return config.models?.pricing?.enabled !== false;
}
