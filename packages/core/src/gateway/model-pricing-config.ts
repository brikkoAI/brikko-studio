import type { BrikkoStudioConfig } from "../config/types.brikko-studio.js";

export function isGatewayModelPricingEnabled(config: BrikkoStudioConfig): boolean {
  return config.models?.pricing?.enabled !== false;
}
