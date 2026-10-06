# 02 — 骨架：內容到頁面再到 CI

Parent: [MVP 實作規格](../../recipe-mvp/issues/09-mvp-implementation-spec.md)

**What to build:** 一個能跑的 Astro 網站：一份固定資料菜譜經內容集合，出現在首頁的清單並能點進一個陽春的菜譜頁；草稿在開發模式看得到、正式建置看不到。每個 PR 自動跑格式、型別與 schema、建置、單元測試、瀏覽器測試與部署設定 dry-run。這張票只求整條路通，不做版面設計。

**Blocked by:** None — can start immediately（「CI 在 PR 上通過」一項需要 01 的遠端儲存庫；01 未完成前以本地執行同一組指令驗證）

**Status:** ready-for-agent

- [ ] 沿用 CarlStack 的技術組合（Astro 靜態輸出＋TypeScript、pnpm、Node 內建測試執行器），全站語言 `zh-Hant`
- [ ] 菜譜 schema 完整對應內容契約（02）：識別值、標題、摘要、正整數份數、非湯料理／湯、草稿旗標、材料（名稱、可選數值與單位、可選備註、分組；「適量」無數值）、依序做法與可選步驟圖、成品圖、材料合照、替代文字、配菜候選（預設否）、蔬菜菜／蛋白質菜、可選的時間／難度／料理風格／標籤／別名／小提醒
- [ ] 缺必填欄位、分類錯誤或份數非正整數時建置失敗（門檻第 1 項）
- [ ] 測試與開發用的固定資料菜譜和正式內容分開；正式內容為零份時建置仍成功
- [ ] 草稿在開發模式顯示、在正式建置的頁面與清單中不存在
- [ ] Playwright 已就位，一個冒煙測試：首頁列出固定資料菜譜並能點進其菜譜頁
- [ ] PR 工作流程依序執行格式檢查、`astro check`、建置、單元測試、Playwright、`wrangler deploy --dry-run`（門檻第 1、7 項）
- [ ] AGENTS.md 寫入代理權限規則（只推送工作分支、開 PR，不推主分支、不合入），並指向 `recipe-writing` skill；README 寫入安裝、開發、建置、測試指令
