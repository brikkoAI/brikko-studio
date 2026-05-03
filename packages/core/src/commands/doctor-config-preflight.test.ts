import { describe, expect, it } from "vitest";
import { withTempHome, writeBrikkoStudioConfig } from "../config/test-helpers.js";
import { runDoctorConfigPreflight } from "./doctor-config-preflight.js";

describe("runDoctorConfigPreflight", () => {
  it("collects legacy config issues outside the normal config read path", async () => {
    await withTempHome(async (home) => {
      await writeBrikkoStudioConfig(home, {
        memorySearch: {
          provider: "local",
          fallback: "none",
        },
      });

      const preflight = await runDoctorConfigPreflight({
        migrateState: false,
        migrateLegacyConfig: false,
        invalidConfigNote: false,
      });

      expect(preflight.snapshot.valid).toBe(false);
      expect(preflight.snapshot.legacyIssues.some((issue) => issue.path === "memorySearch")).toBe(
        true,
      );
      expect((preflight.baseConfig as { memorySearch?: unknown }).memorySearch).toMatchObject({
        provider: "local",
        fallback: "none",
      });
    });
  });
});
