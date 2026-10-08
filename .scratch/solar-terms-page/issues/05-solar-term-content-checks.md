# 05: 節氣內容檢查與來源紀錄

**What to build:** 站主跑 `pnpm check:content` 時，節氣內容有缺漏或來源不完整就被擋下：24 個節氣齊全且無多餘識別值、每筆通過 schema、每筆說明在來源紀錄有對照且對照網址列於 `sources`、核准來源網址不出現在建置輸出；總覽頁文案納入既有「不得提 AI 或試做」檢查。來源紀錄格式沿用專題來源紀錄，對照以節氣識別值取代段落標題，放在內容集合與公開輸出之外。空集合時檢查通過（見 02 空集合規則）。

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] 單元測試（比照專題內容檢查測試）涵蓋：缺節氣、多出未知識別值、schema 錯誤、說明無來源對照、對照網址未列於 sources、來源網址洩漏、空集合通過
- [ ] 節氣檢查併入 `pnpm check:content`，可用 02 的環境變數改目錄
- [ ] 總覽頁出現「AI」「試做」時被既有文案檢查擋下（測試）
- [ ] AGENTS.md `pnpm check:content` 說明補上節氣檢查項目
- [ ] `pnpm check && pnpm test && pnpm test:e2e` 通過
