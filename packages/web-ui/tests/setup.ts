/**
 * Vitest setup — extend the runtime `expect` with @testing-library/jest-dom
 * matchers (toBeInTheDocument, toHaveClass, toHaveAttribute, etc.).
 *
 * We import `expect` from vitest directly + the matchers from
 * `@testing-library/jest-dom/matchers` so that pnpm's deduplication can't
 * cross-thread different vitest instances. The shorter
 * `import "@testing-library/jest-dom/vitest"` path failed because the
 * dist/vitest.mjs file imports from `vitest` and pnpm hoisted multiple
 * vitest copies — the one inside jest-dom's dependency tree wasn't the
 * one running our tests.
 */
import { expect } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";

expect.extend(matchers);
