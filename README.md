# CarlKitchen

由 AI 依公開資料整理、站主審閱的繁體中文菜譜網站。內容未經試做。網址：<https://carlkitchen.gravito.dev>

技術：Astro 靜態輸出、TypeScript、pnpm、Playwright，部署於 Cloudflare Workers Static Assets。

## 開發

需要 Node.js 22.13 以上與 pnpm。

```sh
pnpm install
pnpm dev                                  # 開發伺服器，草稿會顯示並標示「草稿」
pnpm build                                # 正式建置到 dist/，排除草稿
pnpm preview                              # 預覽 dist/
pnpm check                                # 格式檢查 + astro check + 建置
pnpm test                                 # 單元測試
pnpm exec playwright install chromium     # 第一次跑 e2e 前安裝瀏覽器
pnpm test:e2e                             # 以固定菜譜建置後執行 Playwright
pnpm format                               # 格式化
```

## 內容結構

一道菜一個資料夾，資料夾名稱就是識別值與網址 slug：

```text
content/recipes/tomato-egg/
  recipe.yaml      # 欄位定義見 src/content/recipe-schema.ts
  hero.webp        # 圖片以相對路徑在 recipe.yaml 引用
  ...
```

- `RECIPES_DIR` 環境變數指定內容根目錄，預設 `content/recipes`（正式內容，目前為空；沒有菜譜時建置仍會成功）。
- 測試與 e2e 使用 `tests/fixtures/recipes/`（含一份草稿），與正式內容分開。
- `draft: true` 的菜譜只在 `pnpm dev` 看得到，正式建置的頁面與清單都不含。

## 部署

自動部署流程尚未建立（後續票）；Cloudflare 設定見 `wrangler.jsonc`。每個 PR 都會跑 `.github/workflows/ci.yml`（job 名稱 `verify`）。
