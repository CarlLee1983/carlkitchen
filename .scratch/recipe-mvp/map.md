# 個人菜譜收藏網站：MVP 規格決策地圖

Label: wayfinder:map
Status: open

## Destination

完成一份可交給實作者的個人菜譜收藏網站 MVP 規格：明確定義菜譜內容契約、本地 AI 製作與人工審核、首頁與菜譜頁、搜尋、四菜一湯／五菜一湯配菜、驗收及靜態發布流程。地圖只解決實作前的決策，不建站或部署。

## Notes

- 技術基線沿用 CarlStack：Astro＋TypeScript、Content Collections、build-time Pagefind、靜態 HTML、GitHub Actions 驗證與 Cloudflare Workers Static Assets。沿用發布架構，不預設沿用視覺風格或全部套件。
- 內容與首頁素材由 AI 在本地製作，經人工確認後提交 Git 發布；網站不設後台、資料庫或即時 AI 呼叫。
- 本地 Markdown 為此目錄的 Wayfinder tracker；開放票見 `issues/`，`Blocked by` 是依賴關係。每次後續 Wayfinder session 至多解決一張票。
- 討論產品決策時使用 `grilling` 與 `domain-modeling`；涉及操作手感或畫面方向時使用 `prototype`。釐清術語後才建立 `GLOSSARY.md`。
- CarlStack 參照：[README](../../../CarlStack/README.md)、[內容 schema](../../../CarlStack/src/content.config.ts)、[發布 workflow](../../../CarlStack/.github/workflows/deploy.yml)、[Wrangler 設定](../../../CarlStack/wrangler.jsonc)。

## Decisions so far

<!-- 已解決票的名稱、連結與一句摘要；完整決定只留在票內。 -->

- [首批讀者與菜譜來源](issues/01-audience-and-launch-content.md)：繁中臺灣用語的多國家常料理、核准的公開來源、至少 12 道非湯料理＋3 道湯進入候選池，由站主逐篇看成品並核准。
- [菜譜、菜色與圖片的內容契約](issues/02-recipe-content-contract.md)：一份菜譜對應一道料理；公開內容有結構化材料、步驟及三類必要圖片，配菜資格另行標記，來源網址只留在私有內部紀錄。
- [本地 AI 製作與人工審核流程](issues/03-local-ai-review-workflow.md)：來源事前核准，AI 本地製作並在工作分支留草稿；站主逐篇看預覽與差異後合入主分支，來源不足或圖文不符就不公開。
- [菜譜搜尋範圍與結果體驗](issues/04-search-behavior.md)：只索引公開菜譜的標題、摘要、材料、標籤與別名；菜／湯篩選、即時搜尋與可分享網址使用靜態 Pagefind。
- [四菜一湯／五菜一湯的配菜規則](issues/05-meal-planner-rules.md)：候選菜不重複且由不同菜色滿足蔬菜與蛋白質最低要求；鎖定項保留，單道替換與模式切換無解時維持原套餐並提示。
- [首頁視覺方向與素材邊界](issues/06-homepage-direction.md)：首頁採第一屏搜尋＋成品大圖、下接即時篩選菜譜清單；安靜克制的日系版面，全站料理圖片統一為手繪水彩插畫並標示「AI 繪製插畫」。

## Not yet specified

- 首批內容與原型確定後，檢查是否出現目前無法具體界定的特殊料理、安全或圖片使用情境；若有，再把它們升格為決策票。

## Out of scope

- 本輪不實作或部署網站；完成決策地圖後另行交付實作。
- MVP 不含後台、資料庫、登入、會員或網站執行時的 AI 呼叫。
