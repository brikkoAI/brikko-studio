import { defineConfig } from "vitest/config";

/**
 * Root vitest config for Brikko Studio.
 *
 * NOTE: packages/core has its own vitest.shared.config.ts that is currently
 * blocked by the Task 4 rebrand-corruption (see NOTES.md). This root config
 * intentionally does NOT extend it. We only discover tests from:
 *   - packages/<our-package>/src/**\/*.test.ts
 *   - packages/<our-package>/tests/**\/*.test.ts
 *   - packages/core/src/i18n/__tests__/**\/*.test.ts (the one file we own
 *     inside upstream's src tree).
 *
 * Anything else under packages/core/ is upstream territory with its own
 * tsgo + vitest workflow and is intentionally excluded.
 */
export default defineConfig({
  test: {
    include: [
      "packages/oauth-client/**/*.test.ts",
      "packages/web-ui/**/*.test.ts",
      "packages/anonymizer/**/*.test.ts",
      "packages/core/src/i18n/__tests__/**/*.test.ts",
    ],
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
});
