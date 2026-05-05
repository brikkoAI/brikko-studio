import { defineConfig, devices } from "@playwright/test";

// Auto-discovers every *.spec.ts in tests/e2e (auth-flow, full-flow, ...).
// Each spec is responsible for its own server lifecycle (auth-flow spawns
// the Studio core; full-flow spawns vite preview on its own port). We do
// NOT use a global `webServer` here because the two specs target different
// transports (real core vs static dist + page.route mocks).
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:3737",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
