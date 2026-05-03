import { importFreshModule } from "brikko-studio/plugin-sdk/test-fixtures";
import { afterEach, describe, expect, it, vi } from "vitest";

type LoggerModule = typeof import("./logger.js");

const originalGetBuiltinModule = (
  process as NodeJS.Process & { getBuiltinModule?: (id: string) => unknown }
).getBuiltinModule;

async function importBrowserSafeLogger(params?: {
  resolvePreferredBrikkoStudioTmpDir?: ReturnType<typeof vi.fn>;
}): Promise<{
  module: LoggerModule;
  resolvePreferredBrikkoStudioTmpDir: ReturnType<typeof vi.fn>;
}> {
  const resolvePreferredBrikkoStudioTmpDir =
    params?.resolvePreferredBrikkoStudioTmpDir ??
    vi.fn(() => {
      throw new Error("resolvePreferredBrikkoStudioTmpDir should not run during browser-safe import");
    });

  vi.doMock("../infra/tmp-brikko-studio-dir.js", async () => {
    const actual = await vi.importActual<typeof import("../infra/tmp-brikko-studio-dir.js")>(
      "../infra/tmp-brikko-studio-dir.js",
    );
    return {
      ...actual,
      resolvePreferredBrikkoStudioTmpDir,
    };
  });

  Object.defineProperty(process, "getBuiltinModule", {
    configurable: true,
    value: undefined,
  });

  const module = await importFreshModule<LoggerModule>(
    import.meta.url,
    "./logger.js?scope=browser-safe",
  );
  return { module, resolvePreferredBrikkoStudioTmpDir };
}

describe("logging/logger browser-safe import", () => {
  afterEach(() => {
    vi.doUnmock("../infra/tmp-brikko-studio-dir.js");
    Object.defineProperty(process, "getBuiltinModule", {
      configurable: true,
      value: originalGetBuiltinModule,
    });
  });

  it("does not resolve the preferred temp dir at import time when node fs is unavailable", async () => {
    const { module, resolvePreferredBrikkoStudioTmpDir } = await importBrowserSafeLogger();

    expect(resolvePreferredBrikkoStudioTmpDir).not.toHaveBeenCalled();
    expect(module.DEFAULT_LOG_DIR).toBe("/tmp/brikko-studio");
    expect(module.DEFAULT_LOG_FILE).toBe("/tmp/brikko-studio/brikko-studio.log");
  });

  it("disables file logging when imported in a browser-like environment", async () => {
    const { module, resolvePreferredBrikkoStudioTmpDir } = await importBrowserSafeLogger();

    expect(module.getResolvedLoggerSettings()).toMatchObject({
      level: "silent",
      file: "/tmp/brikko-studio/brikko-studio.log",
    });
    expect(module.isFileLogLevelEnabled("info")).toBe(false);
    expect(() => module.getLogger().info("browser-safe")).not.toThrow();
    expect(resolvePreferredBrikkoStudioTmpDir).not.toHaveBeenCalled();
  });
});
