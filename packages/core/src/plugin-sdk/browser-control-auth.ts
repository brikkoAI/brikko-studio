import type { BrikkoStudioConfig } from "../config/types.brikko-studio.js";
import { loadBundledPluginPublicSurfaceModuleSync } from "./facade-loader.js";

export type BrowserControlAuth = {
  token?: string;
  password?: string;
};

type EnsureBrowserControlAuthParams = {
  cfg: BrikkoStudioConfig;
  env?: NodeJS.ProcessEnv;
};

type EnsureBrowserControlAuthResult = {
  auth: BrowserControlAuth;
  generatedToken?: string;
};

type BrowserControlAuthSurface = {
  resolveBrowserControlAuth: (cfg?: BrikkoStudioConfig, env?: NodeJS.ProcessEnv) => BrowserControlAuth;
  shouldAutoGenerateBrowserAuth: (env: NodeJS.ProcessEnv) => boolean;
  ensureBrowserControlAuth: (
    params: EnsureBrowserControlAuthParams,
  ) => Promise<EnsureBrowserControlAuthResult>;
};

let cachedBrowserControlAuthSurface: BrowserControlAuthSurface | undefined;

function loadBrowserControlAuthSurface(): BrowserControlAuthSurface {
  cachedBrowserControlAuthSurface ??=
    loadBundledPluginPublicSurfaceModuleSync<BrowserControlAuthSurface>({
      dirName: "browser",
      artifactBasename: "browser-control-auth.js",
    });
  return cachedBrowserControlAuthSurface;
}

export function resolveBrowserControlAuth(
  cfg?: BrikkoStudioConfig,
  env: NodeJS.ProcessEnv = process.env,
): BrowserControlAuth {
  return loadBrowserControlAuthSurface().resolveBrowserControlAuth(cfg, env);
}

export function shouldAutoGenerateBrowserAuth(env: NodeJS.ProcessEnv): boolean {
  return loadBrowserControlAuthSurface().shouldAutoGenerateBrowserAuth(env);
}

export async function ensureBrowserControlAuth(
  params: EnsureBrowserControlAuthParams,
): Promise<EnsureBrowserControlAuthResult> {
  return await loadBrowserControlAuthSurface().ensureBrowserControlAuth(params);
}
