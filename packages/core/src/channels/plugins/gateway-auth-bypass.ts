import type { BrikkoStudioConfig } from "../../config/types.brikko-studio.js";
import { loadBundledPluginPublicArtifactModuleSync } from "../../plugins/public-surface-loader.js";

type GatewayAuthBypassApi = {
  resolveGatewayAuthBypassPaths?: (params: { cfg: BrikkoStudioConfig }) => readonly unknown[];
};

const GATEWAY_AUTH_API_ARTIFACT_BASENAME = "gateway-auth-api.js";
const MISSING_PUBLIC_SURFACE_PREFIX = "Unable to resolve bundled plugin public surface ";

function loadBundledChannelGatewayAuthApi(channelId: string): GatewayAuthBypassApi | undefined {
  try {
    return loadBundledPluginPublicArtifactModuleSync<GatewayAuthBypassApi>({
      dirName: channelId,
      artifactBasename: GATEWAY_AUTH_API_ARTIFACT_BASENAME,
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith(MISSING_PUBLIC_SURFACE_PREFIX)) {
      return undefined;
    }
    throw error;
  }
}

export function resolveBundledChannelGatewayAuthBypassPaths(params: {
  channelId: string;
  cfg: BrikkoStudioConfig;
}): string[] {
  const api = loadBundledChannelGatewayAuthApi(params.channelId);
  const paths = api?.resolveGatewayAuthBypassPaths?.({ cfg: params.cfg }) ?? [];
  return paths.flatMap((path) => (typeof path === "string" && path.trim() ? [path.trim()] : []));
}
