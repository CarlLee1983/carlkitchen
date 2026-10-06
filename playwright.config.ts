import { defineConfig, devices } from "@playwright/test";

// 不在這裡建置：`pnpm test:e2e` 先建置兩份站台，再由 scripts/run-e2e.mjs 依序跑兩輪 playwright（astro preview 同一專案
// 一次只能起一個，所以兩份站台不能同時 serve）。以 E2E_SITE 選擇這一輪測哪份站台：
// - 預設（chromium 專案）：`tests/fixtures/recipes` 建置到 `dist`，跑除 `meal.spec.ts` 以外的規格；
//   它的候選池不足四菜一湯，同時用來驗證「候選不足」。
// - E2E_SITE=meal（meal 專案）：`tests/fixtures/meal-recipes` 建置到 `dist-meal`，
//   候選池剛好 5 道非湯菜加 1 道湯，只跑 `meal.spec.ts`。
const mealSite = process.env.E2E_SITE === "meal";
// 兩份站台用不同 port：即使本地殘留另一份 preview，也不會被誤重用；規格另會核對實際被 serve 的候選池。
const port = mealSite ? 4322 : 4321;

const desktop = {
  ...devices["Desktop Chrome"],
  baseURL: `http://localhost:${port}`,
};

export default defineConfig({
  testDir: "./e2e",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  projects: mealSite
    ? [{ name: "meal", testMatch: "**/meal.spec.ts", use: desktop }]
    : [{ name: "chromium", testIgnore: "**/meal.spec.ts", use: desktop }],
  webServer: {
    command: `pnpm exec astro preview --port ${port}`,
    url: `http://localhost:${port}/`,
    reuseExistingServer: !process.env.CI,
    env: {
      // Astro 7 在偵測到代理環境時會把 preview 丟到背景並立刻結束，Playwright 會誤判為啟動失敗；
      // 設定此變數可略過代理偵測，維持前景執行。
      ASTRO_PREVIEW_BACKGROUND: "1",
      ASTRO_OUT_DIR: mealSite ? "dist-meal" : "dist",
    },
  },
});
