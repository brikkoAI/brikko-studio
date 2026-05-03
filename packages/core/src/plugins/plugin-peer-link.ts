import fs from "node:fs/promises";
import path from "node:path";
import { resolveBrikkoStudioPackageRootSync } from "../infra/brikko-studio-root.js";

type PluginPeerLinkLogger = {
  info?: (message: string) => void;
  warn?: (message: string) => void;
};

/**
 * Symlink the host brikko-studio package for plugins that declare it as a peer.
 * Plugin package managers still own third-party dependencies; this only wires
 * the host SDK package into the plugin-local Node graph.
 */
export async function linkBrikkoStudioPeerDependencies(params: {
  installedDir: string;
  peerDependencies: Record<string, string>;
  logger: PluginPeerLinkLogger;
}): Promise<void> {
  const peers = Object.keys(params.peerDependencies).filter((name) => name === "brikko-studio");
  if (peers.length === 0) {
    return;
  }

  const hostRoot = resolveBrikkoStudioPackageRootSync({
    argv1: process.argv[1],
    moduleUrl: import.meta.url,
    cwd: process.cwd(),
  });
  if (!hostRoot) {
    params.logger.warn?.(
      "Could not locate brikko-studio package root to symlink peerDependencies; plugin may fail to resolve brikko-studio at runtime.",
    );
    return;
  }

  const nodeModulesDir = path.join(params.installedDir, "node_modules");
  await fs.mkdir(nodeModulesDir, { recursive: true });

  for (const peerName of peers) {
    const linkPath = path.join(nodeModulesDir, peerName);

    try {
      await fs.rm(linkPath, { recursive: true, force: true });
      await fs.symlink(hostRoot, linkPath, "junction");
      params.logger.info?.(`Linked peerDependency "${peerName}" -> ${hostRoot}`);
    } catch (err) {
      params.logger.warn?.(`Failed to symlink peerDependency "${peerName}": ${String(err)}`);
    }
  }
}
