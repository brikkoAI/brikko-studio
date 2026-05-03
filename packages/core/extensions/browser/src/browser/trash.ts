import os from "node:os";
import { movePathToTrash as movePathToTrashWithAllowedRoots } from "brikko-studio/plugin-sdk/browser-config";
import { resolvePreferredBrikkoStudioTmpDir } from "brikko-studio/plugin-sdk/temp-path";

export async function movePathToTrash(targetPath: string): Promise<string> {
  return await movePathToTrashWithAllowedRoots(targetPath, {
    allowedRoots: [os.homedir(), resolvePreferredBrikkoStudioTmpDir()],
  });
}
