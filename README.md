# CarlKitchen

由 AI 依公開資料整理、站主審閱的繁體中文菜譜網站。內容未經試做。網址：<https://carlkitchen.gravito.dev>

技術：Astro 靜態輸出、TypeScript、pnpm、Playwright，部署於 Cloudflare Workers Static Assets。

讀者可在菜譜頁加入收藏，並從「我的收藏」查看或移除。收藏只存在目前瀏覽器的本機儲存空間；換裝置、清除網站資料或停用瀏覽器儲存後不會同步保留。菜譜本身仍可用原本網址分享。

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
pnpm test:e2e                             # 以固定菜譜與食材條目建置後執行 Playwright
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

- `RECIPES_DIR` 環境變數指定菜譜目錄，預設 `content/recipes`；`SOURCES_DIR` 指定內部菜譜來源紀錄，預設 `content/sources`。
- 食材條目位於 `content/ingredients/<識別值>/ingredient.yaml`，以 `INGREDIENTS_DIR` 切換；其核准來源紀錄位於 `content/ingredient-sources/<識別值>.yaml`，以 `INGREDIENT_SOURCES_DIR` 切換。來源紀錄的 `sources` 項目各有 `title` 與 `url`，條目頁文末從該紀錄顯示公開連結。
- 食材條目必填短介、選用、處理、保存與用途；已發布條目至少連到一篇相關菜譜，草稿可暫無。蔬菜另填臺灣主要產期與適用範圍；只有來源明確記載最佳賞味期時才填該欄位。酒精或過敏原有來源可核對時，選填 `notices.alcohol` 或 `notices.allergens`，頁面會以獨立區塊顯示。圖片可省略；有圖時必填替代文字，並遵守 WebP、1536×1024、不超過 300 KB。
- `draft: true` 的菜譜與食材條目只在 `pnpm dev` 看得到，正式建置不輸出草稿頁。高麗菜、空心菜、青花菜、米酒、蔥、薑、蒜、蝦米與醬油已經站主逐篇審閱，可在正式建置開啟各自條目。秋葵、醬油膏與素蠔油的草稿文字也已審閱，仍須等有對應的已發布菜譜後再送審發布。
- 測試與 e2e 使用 `tests/fixtures/recipes/` 和 `tests/fixtures/ingredients/`，與正式內容分開。`pnpm build && pnpm check:content` 檢查內容與輸出；食材條目不進入目前只收錄菜譜的站內搜尋索引。

## 部署與回滾

推送 `main` 或手動觸發（手動觸發也只部署 `main`，選其他分支會跳過）時，`.github/workflows/deploy.yml` 依序執行：與 CI 相同的必要檢查（共用 `.github/actions/verify`，PR 的 job 名稱仍是 `verify`）、以正式內容重新建置、`pnpm check:content --launch`（候選池門檻：非湯料理 ≥ 12、湯 ≥ 3），最後 `wrangler deploy`。任一步驟失敗就不部署；未達門檻時日誌會列出缺額，這不影響合入。沒有排程，並行部署排隊、不互相取消。網站只在 `carlkitchen.gravito.dev` 提供（`wrangler.jsonc` 已關閉 workers.dev 與預覽網址）。部署用的 `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID` 存在儲存庫 secrets。

上線前依 [`docs/acceptance.md`](docs/acceptance.md) 的檢核表在上線 PR 逐項勾選。

### 回滾

一般情況：以 `git revert` 撤銷造成問題的變更，經 PR 合入，自動重新部署，主分支仍等於正式站。

只有 CI 本身故障而無法部署時，才緊急退回上一版，之後必須修正主分支：

```sh
read -s CLOUDFLARE_API_TOKEN && export CLOUDFLARE_API_TOKEN   # 貼上 token，不回顯、不進 shell 歷史；也可改用 wrangler login
export CLOUDFLARE_ACCOUNT_ID=...
pnpm exec wrangler deployments list --name carlkitchen   # 查看部署與版本
pnpm exec wrangler rollback --name carlkitchen -m "原因"  # 退回上一版；也可指定版本 ID
```
