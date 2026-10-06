# 專案守則

CarlKitchen：由 AI 整理公開資料、站主審閱的繁體中文菜譜網站。Astro 靜態輸出，部署在 Cloudflare Workers Static Assets（`carlkitchen.gravito.dev`）。

## 目錄結構

- `src/` — 網站程式：`content.config.ts`（內容集合）、`content/recipe-schema.ts`（菜譜 schema）、`pages/`、`layouts/`、`utils/`
- `content/recipes/<菜譜識別值>/` — 正式菜譜：`recipe.yaml` 與同資料夾的 WebP 圖片（YAML 以相對路徑引用）。資料夾名稱即識別值與網址 `/recipes/<識別值>/`；識別值只能是小寫英數字以連字號分隔（`^[a-z0-9]+(?:-[a-z0-9]+)*$`，例如 `tomato-egg`），內容檢查會擋下其他格式
- `content/sources/<菜譜識別值>.yaml` — 內部來源紀錄：`urls` 列出至少一個核准來源網址。位於內容集合載入範圍（`content/recipes`）與 `public/` 之外，不被任何頁面或建置流程讀取，只由內容檢查指令讀取
- `tests/` — 單元測試（Node 內建測試執行器）；`tests/fixtures/recipes/` 為測試用固定菜譜，含一份草稿
- `e2e/` — Playwright 瀏覽器測試
- `.scratch/` — 規格與票；`.claude/skills/recipe-writing/` — 菜譜寫作 skill

## 指令

套件管理用 pnpm。

- `pnpm dev` — 開發伺服器（顯示草稿）
- `pnpm build` / `pnpm preview` — 正式建置（排除草稿，建置後以 Pagefind 建立只含菜譜頁的搜尋索引）與預覽。建置固定帶 `--force`，在 `RECIPES_DIR` 切換時清除 Astro 內容層快取，不可拿掉
- `pnpm check` — 格式檢查、`astro check`、建置
- `pnpm check:content` — 內容與建置輸出檢查（來源紀錄、洩漏、圖片規格）；需先 `pnpm build`，輸出目錄預設 `dist`（`--dist <目錄>` 可改）。加 `--launch` 另檢查候選池門檻（非湯配菜候選 ≥ 12、湯 ≥ 3），供部署前使用，PR 不開。`SOURCES_DIR` 可改來源紀錄目錄
- `pnpm test` — 單元測試
- `pnpm test:e2e` — 以固定菜譜建置後跑 Playwright（chromium）
- `pnpm format` — 格式化

環境變數 `RECIPES_DIR` 選擇內容根目錄，預設 `content/recipes`；測試與 e2e 用 `tests/fixtures/recipes`。

## 寫作與內容

撰寫菜譜文字依 `recipe-writing` skill（`.claude/skills/recipe-writing/`）。schema 規則見 `src/content/recipe-schema.ts`：每張圖都是 `{ src, alt }`，alt 必填；已發布菜譜須有成品圖（`hero`）、材料合照（`ingredientsPhoto`）與至少一張步驟圖。

圖片規格慣例：WebP、1536×1024、不超過 300 KB。schema 不檢查這些，由 `pnpm check:content` 強制（門檻第 4 項）。

## 程式與測試

註解與文件用繁體中文，程式識別字用英文。先寫失敗的測試再實作；修 bug 附回歸測試。提交前跑 `pnpm check && pnpm test && pnpm test:e2e`。

## 代理權限

- 草稿留在本地工作分支。
- 準備好請站主審閱時，才推送工作分支並開 PR。
- 不得推送 `main`，不得合入任何 PR（包含 `gh pr merge`）。合入由站主完成，等同發布核准。
