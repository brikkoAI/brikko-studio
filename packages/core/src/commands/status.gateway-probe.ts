import type { BrikkoStudioConfig } from "../config/types.brikko-studio.js";
import {
  resolveGatewayProbeAuthSafeWithSecretInputs,
  resolveGatewayProbeTarget,
} from "../gateway/probe-auth.js";
export { pickGatewaySelfPresence } from "./gateway-presence.js";

export async function resolveGatewayProbeAuthResolution(cfg: BrikkoStudioConfig): Promise<{
  auth: {
    token?: string;
    password?: string;
  };
  warning?: string;
}> {
  const target = resolveGatewayProbeTarget(cfg);
  return resolveGatewayProbeAuthSafeWithSecretInputs({
    cfg,
    mode: target.mode,
    env: process.env,
  });
}

export async function resolveGatewayProbeAuth(cfg: BrikkoStudioConfig): Promise<{
  token?: string;
  password?: string;
}> {
  return (await resolveGatewayProbeAuthResolution(cfg)).auth;
}
