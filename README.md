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

## 部署與回滾

推送 `main` 或手動觸發時，`.github/workflows/deploy.yml` 依序執行：與 CI 相同的必要檢查（共用 `.github/actions/verify`，PR 的 job 名稱仍是 `verify`）、以正式內容重新建置、`pnpm check:content --launch`（候選池門檻：非湯料理 ≥ 12、湯 ≥ 3），最後 `wrangler deploy`。任一步驟失敗就不部署；未達門檻時日誌會列出缺額，這不影響合入。沒有排程，並行部署排隊、不互相取消。網站只在 `carlkitchen.gravito.dev` 提供（`wrangler.jsonc` 已關閉 workers.dev 與預覽網址）。部署用的 `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID` 存在儲存庫 secrets。

上線前依 [`docs/acceptance.md`](docs/acceptance.md) 的檢核表在上線 PR 逐項勾選。

### 回滾

一般情況：以 `git revert` 撤銷造成問題的變更，經 PR 合入，自動重新部署，主分支仍等於正式站。

只有 CI 本身故障而無法部署時，才緊急退回上一版，之後必須修正主分支：

```sh
export CLOUDFLARE_API_TOKEN=...   # 本機取得的 token，不要寫進檔案
export CLOUDFLARE_ACCOUNT_ID=...
pnpm exec wrangler deployments list --name carlkitchen   # 查看部署與版本
pnpm exec wrangler rollback --name carlkitchen -m "原因"  # 退回上一版；也可指定版本 ID
```
