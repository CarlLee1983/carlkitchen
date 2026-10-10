import {
  defineConfig,
  devices,
  type PlaywrightTestProject,
} from "@playwright/test";

// 不在這裡建置：`pnpm test:e2e` 先建置三份站台，再由 scripts/run-e2e.mjs 依序跑三輪 playwright（astro preview 同一專案
// 一次只能起一個，所以三份站台不能同時 serve）。以 E2E_SITE 選擇這一輪測哪份站台：
// - 預設（chromium 專案）：`tests/fixtures/recipes` 建置到 `dist`，跑除 `meal.spec.ts`、`show-more.spec.ts` 以外的規格；
//   它的候選池不足四菜一湯，同時用來驗證「候選不足」。
// - E2E_SITE=meal（meal 專案）：`tests/fixtures/meal-recipes` 建置到 `dist-meal`，
//   候選池剛好 5 道非湯菜加 1 道湯，只跑 `meal.spec.ts`。
// - E2E_SITE=show-more（show-more 專案）：預設的固定菜譜以每批 1 道（HOME_BATCH_SIZE=1）建置到
//   `dist-show-more`（含 Pagefind 索引），只跑 `show-more.spec.ts`。
// 新增站台時，scripts/run-e2e.mjs 的 rounds 與 package.json 的建置指令要同步改。
const SITES: Record<
  string,
  { outDir: string; portOffset: number; project: PlaywrightTestProject }
> = {
  default: {
    outDir: "dist",
    portOffset: 0,
    project: {
      name: "chromium",
      testIgnore: ["**/meal.spec.ts", "**/show-more.spec.ts"],
    },
  },
  meal: {
    outDir: "dist-meal",
    portOffset: 1,
    project: { name: "meal", testMatch: "**/meal.spec.ts" },
  },
  "show-more": {
    outDir: "dist-show-more",
    portOffset: 2,
    project: { name: "show-more", testMatch: "**/show-more.spec.ts" },
  },
};
const siteName = process.env.E2E_SITE ?? "default";
if (!(siteName in SITES)) throw new Error(`未知的 E2E_SITE：${siteName}`);
const site = SITES[siteName]!;
// 三份站台用不同 port：即使本地殘留另一份 preview，也不會被誤重用；規格另會核對實際被 serve 的候選池。
const portBase = Number(process.env.E2E_PORT_BASE ?? 4321);
const port = portBase + site.portOffset;

const desktop = {
  ...devices["Desktop Chrome"],
  baseURL: `http://localhost:${port}`,
};

export default defineConfig({
  testDir: "./e2e",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  projects: [{ ...site.project, use: desktop }],
  webServer: {
    command: `pnpm exec astro preview --port ${port}`,
    url: `http://localhost:${port}/`,
    // 一律自己起 preview：沿用殘留的 server 會測到別的工作目錄或舊建置的內容。
    // port 被占用時 Playwright 直接報錯；平行跑請換 E2E_PORT_BASE，並各用一個 worktree（`dist` 也不共用）。
    // 經 `pnpm test:e2e`（scripts/run-e2e.mjs）執行且沒設 E2E_PORT_BASE 時，會自動挑三個連續 port 都空著的起點。
    reuseExistingServer: false,
    env: {
      // Astro 7 在偵測到代理環境時會把 preview 丟到背景並立刻結束，Playwright 會誤判為啟動失敗；
      // 設定此變數可略過代理偵測，維持前景執行。
      ASTRO_PREVIEW_BACKGROUND: "1",
      ASTRO_OUT_DIR: site.outDir,
    },
  },
});
