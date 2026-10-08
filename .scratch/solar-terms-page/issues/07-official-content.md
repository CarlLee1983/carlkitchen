# 07: 正式節氣內容送審

**What to build:** 讀者在正式網站看到完整的節氣總覽：24 筆說明依 06 核准來源撰寫並有來源紀錄對照，當令食材依食材條目產期文字選定，整頁經站主審閱後發布。

**Blocked by:** 03、04、05、06

**Status:** ready-for-agent

- [ ] 24 筆正式節氣資料與來源紀錄，說明只寫核准來源支持的事實，不寫養生功效
- [ ] 實作者依食材條目產期文字提出當令食材建議清單，經站主確認後才寫入
- [ ] 說明文字依 `de-ai-voice` 去 AI 味，只改腔調
- [ ] ADR 0008 的 Falsified if 以反引號補上節氣資料、總覽頁與節氣檢查的路徑
- [ ] `pnpm build && pnpm check:content` 以正式內容通過；`pnpm check && pnpm test && pnpm test:e2e`、`pnpm check:merge --e2e` 通過
- [ ] 推送工作分支並開 PR 請站主審閱；不推送 main、不合入
