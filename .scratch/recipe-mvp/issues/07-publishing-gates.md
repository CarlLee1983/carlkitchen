# 靜態發布與品質驗收關卡

Type: grilling
Status: resolved
Assignee: Carl
Blocked by: 03, 04, 05

## Question

CarlStack 的 Astro Content Collections、Pagefind、GitHub Actions 與 Cloudflare Workers Static Assets 應如何用於本站？哪些 schema、圖片、搜尋（含正式索引上的繁中菜名、材料、別名、菜／湯篩選與草稿／來源排除）、配菜（含候選池數量、不同菜色的蔬菜／蛋白質要求、鎖定／替換無解與同分頁重整）、來源紀錄與建置輸出洩漏檢查必須在站主合入主分支或發布前通過；如何確保只有站主能完成合入，正式網址、預覽、部署觸發及回滾如何安排？

## Answer

### 儲存庫與合入權限

- CarlKitchen 是私有 GitHub 儲存庫。公開菜譜與內部來源紀錄放在同一個儲存庫，來源紀錄置於 Astro 內容載入範圍與 `public/` 之外，同一個 PR 即可檢查兩者的對應。這是對「個人專案使用公開儲存庫」慣例的刻意例外，實作時須在 README 與 AGENTS.md 註明原因。
- 主分支開啟分支保護：變更必須經由 PR、所有必要檢查通過才能合入，禁止強制推送與刪除。只有站主有寫入權限，因此只有站主能完成合入；合入動作即是[本地 AI 製作流程](03-local-ai-review-workflow.md)所定的發布核准。
- AGENTS.md 規定代理只能推送工作分支並開 PR，不得推送主分支或合入 PR（含 `gh pr merge`）。

### 部署

- 沿用 CarlStack 的 Astro 靜態輸出、build-time Pagefind、GitHub Actions 與 Cloudflare Workers Static Assets。推送到主分支即自動部署，另保留手動觸發；不設排程，首頁隨機大圖在瀏覽器端選取，無須重建。
- 正式網址是 `carlkitchen.gravito.dev`（Cloudflare 自訂網域）。`wrangler.jsonc` 關閉 `workers_dev` 與 `preview_urls`，網站只在正式網址提供。
- 不設公開預覽；站主以本地 `astro dev`／`astro preview` 審閱草稿與 PR 內容，避免未核准內容出現在公開網址。
- 部署工作另檢查配菜候選池：非湯料理少於 12 道或湯少於 3 道時停止部署並列出缺額。此檢查不阻擋合入，菜譜可在達標前逐篇合入主分支；首次達標後，之後每次部署都須維持門檻。
- 回滾：一般以 `git revert` 撤銷主分支上的問題變更，由自動部署恢復，維持主分支等於正式站。只有 CI 本身故障而無法部署時，才用 `wrangler rollback` 緊急退回上一版，隨後修正主分支。程序寫入 README。

### 合入與部署前的必要檢查

每個 PR 都執行下列檢查，部署前再執行一次；任一失敗即阻擋合入或部署。

1. 格式、型別與 schema：`astro check` 與建置，schema 涵蓋[內容契約](02-recipe-content-contract.md)的必填欄位、分類、配菜候選與蔬菜／蛋白質標記。
2. 來源紀錄：每份公開菜譜都有至少一個來源網址的內部紀錄，且沒有對不到菜譜的孤兒紀錄。
3. 建置輸出洩漏：`dist` 不含草稿頁面或 slug，也不含任何內部來源網址。
4. 圖片：主分支中的料理圖片皆為 WebP、1536×1024、不超過 300 KB 並有替代文字；每份公開菜譜都有成品圖、材料合照與至少一張步驟圖。PNG 原圖屬中間產物，不進主分支。
5. 搜尋：以 Playwright 對建置後的網站執行。斷言由真實內容產生，不寫死預期結果：每道菜的菜名、材料與別名都能以繁中查到該菜譜；菜／湯篩選正確；只出現在步驟、用量或替代文字中的詞查不到；草稿與來源不出現在結果中。
6. 配菜：抽選演算法的單元測試，以及 Playwright 依[配菜規則原型](05-meal-planner-rules.md)的四個情境（替換無解、鎖定衝突、候選不足、同分頁重整）驗證。此項以測試專用的固定菜譜資料建置，不依賴正式候選池的數量。
7. `wrangler deploy --dry-run`。
8. 無障礙與版面：以 Playwright 對五個頁面執行 axe-core，並在 360、390、430、1366、1920 寬度檢查沒有水平捲動、觸控目標至少 44×44 px（標準見 [MVP 驗收票](08-mvp-acceptance.md)）。

第 1–4 項對真實內容執行。單元測試沿用 CarlStack 的 Node 內建測試執行器，瀏覽器測試使用 Playwright。CarlStack 本身沒有第 2–6 項與第 8 項，這些是本站因 AI 製作內容而新增的機械檢查。

站主已逐項確認上述決定。
