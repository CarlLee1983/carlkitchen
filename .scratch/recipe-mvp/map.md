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

- [首批讀者與菜譜來源](issues/01-audience-and-launch-content.md)：繁中臺灣家常菜、核准的公開來源、至少 12 菜＋3 湯，由站主逐篇看成品並核准。

## Not yet specified

- 首批內容與原型確定後，檢查是否出現目前無法具體界定的特殊料理、安全或圖片使用情境；若有，再把它們升格為決策票。

## Out of scope

- 本輪不實作或部署網站；完成決策地圖後另行交付實作。
- MVP 不含後台、資料庫、登入、會員或網站執行時的 AI 呼叫。
