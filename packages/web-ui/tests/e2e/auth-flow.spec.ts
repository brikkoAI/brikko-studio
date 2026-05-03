import { test, expect } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startMockGateway } from "./fixtures/mock-gateway.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// tests/e2e/ -> packages/web-ui/ -> packages/ -> repo root
const REPO_ROOT = path.resolve(__dirname, "../../../..");
const STUDIO_PORT = 3737;
const GATEWAY_PORT = 18443;

let gateway: Awaited<ReturnType<typeof startMockGateway>>;
let studio: ChildProcess;

test.beforeAll(async () => {
  gateway = await startMockGateway(GATEWAY_PORT);
  studio = spawn(
    "node",
    [path.join(REPO_ROOT, "packages/core/brikko-studio.mjs")],
    {
      env: {
        ...process.env,
        BRIKKO_PORT: String(STUDIO_PORT),
        BRIKKO_GATEWAY: `http://127.0.0.1:${GATEWAY_PORT}`,
        BRIKKO_USE_INMEM_KEYCHAIN: "1",
        BRIKKO_WEB_UI_DIST: path.join(REPO_ROOT, "packages/web-ui/dist"),
      },
      stdio: "pipe",
    }
  );
  for (let i = 0; i < 30; i++) {
    try {
      const r = await fetch(
        `http://127.0.0.1:${STUDIO_PORT}/api/auth/status`
      );
      if (r.ok) return;
    } catch {
      // not yet ready
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("Studio did not start");
});

test.afterAll(async () => {
  studio.kill("SIGTERM");
  await gateway.close();
});

test("user can complete the OAuth flow end-to-end", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("welcome")).toBeVisible();
  await expect(page.getByTestId("login-button")).toContainText(
    "Войти через Brikko"
  );

  await page.getByTestId("login-button").click();

  await expect(page).toHaveURL(/\/status$/, { timeout: 10_000 });
  await expect(page.getByTestId("user-email")).toContainText(
    "e2e@brikko.ru"
  );
});
