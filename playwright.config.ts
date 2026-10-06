import { defineConfig, devices } from "@playwright/test";

// 不在這裡建置：`pnpm test:e2e` 先以 RECIPES_DIR=tests/fixtures/recipes 建置，
// 再由 webServer 對 dist 跑 astro preview。
const port = 4321;

export default defineConfig({
  testDir: "./e2e",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: `http://localhost:${port}` },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm exec astro preview --port ${port}`,
    url: `http://localhost:${port}/`,
    reuseExistingServer: !process.env.CI,
    // Astro 7 在偵測到代理環境時會把 preview 丟到背景並立刻結束，Playwright 會誤判為啟動失敗；
    // 設定此變數可略過代理偵測，維持前景執行。
    env: { ASTRO_PREVIEW_BACKGROUND: "1" },
  },
});
