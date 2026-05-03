import fs from "node:fs";
import path from "node:path";
import { resolveBrikko StudioPackageRoot } from "../infra/brikko-studio-root.js";

export const BRIKKO_STUDIO_DOCS_URL = "https://docs.brikko-studio.ai";
export const BRIKKO_STUDIO_SOURCE_URL = "https://github.com/brikko-studio/brikko-studio";

type ResolveBrikko StudioReferencePathParams = {
  workspaceDir?: string;
  argv1?: string;
  cwd?: string;
  moduleUrl?: string;
};

function isUsableDocsDir(docsDir: string): boolean {
  return fs.existsSync(path.join(docsDir, "docs.json"));
}

function isGitCheckout(rootDir: string): boolean {
  return fs.existsSync(path.join(rootDir, ".git"));
}

export async function resolveBrikko StudioDocsPath(params: {
  workspaceDir?: string;
  argv1?: string;
  cwd?: string;
  moduleUrl?: string;
}): Promise<string | null> {
  const workspaceDir = params.workspaceDir?.trim();
  if (workspaceDir) {
    const workspaceDocs = path.join(workspaceDir, "docs");
    if (isUsableDocsDir(workspaceDocs)) {
      return workspaceDocs;
    }
  }

  const packageRoot = await resolveBrikko StudioPackageRoot({
    cwd: params.cwd,
    argv1: params.argv1,
    moduleUrl: params.moduleUrl,
  });
  if (!packageRoot) {
    return null;
  }

  const packageDocs = path.join(packageRoot, "docs");
  return isUsableDocsDir(packageDocs) ? packageDocs : null;
}

export async function resolveBrikko StudioSourcePath(
  params: ResolveBrikko StudioReferencePathParams,
): Promise<string | null> {
  const packageRoot = await resolveBrikko StudioPackageRoot({
    cwd: params.cwd,
    argv1: params.argv1,
    moduleUrl: params.moduleUrl,
  });
  if (!packageRoot || !isGitCheckout(packageRoot)) {
    return null;
  }
  return packageRoot;
}

export async function resolveBrikko StudioReferencePaths(
  params: ResolveBrikko StudioReferencePathParams,
): Promise<{
  docsPath: string | null;
  sourcePath: string | null;
}> {
  const [docsPath, sourcePath] = await Promise.all([
    resolveBrikko StudioDocsPath(params),
    resolveBrikko StudioSourcePath(params),
  ]);
  return { docsPath, sourcePath };
}
