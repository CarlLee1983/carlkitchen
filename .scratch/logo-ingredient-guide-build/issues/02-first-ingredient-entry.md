# 02: 第一篇食材條目從草稿到公開

**What to build:** 讓站主能依已核准來源製作、預覽並審閱一篇食材條目；核准後，讀者可在靜態頁面閱讀其食材知識並前往相關菜譜。這篇代表條目同時打通內容資料、圖片、草稿隔離、來源紀錄、輸出檢查與讀者頁面。

**Blocked by:** [食材介紹的閱讀路徑與頁面原型](../../logo-ingredient-guide/issues/03-guide-prototype.md)；[食材條目的內容契約與時令表述](../../logo-ingredient-guide/issues/04-content-contract.md)；[食材內容的來源紀錄與審閱流程](../../logo-ingredient-guide/issues/05-editorial-workflow.md)；[Logo 與食材介紹的實作邊界及驗收標準](../../logo-ingredient-guide/issues/07-handoff-criteria.md)。無本目錄內部依賴。

**Status:** ready-for-agent

- [ ] 一篇符合定案內容契約的食材條目可在本地草稿預覽；正式建置不輸出草稿頁、草稿連結或來源紀錄。
- [ ] 站主核准來源與條目後，正式建置會產生可直接造訪的頁面，並依決策連到至少一篇相關菜譜。
- [ ] 缺少必填內容、核准來源或必要圖片說明時，內容檢查以可定位的訊息阻擋發布。
- [ ] 食材的產季、保存、產品差異或安全提醒遵守定案內容契約，不把候選來源當成已核准來源。
- [ ] 單元測試覆蓋內容檢查邊界，瀏覽器測試覆蓋草稿隔離與正式頁面的讀者流程；必要檢查通過。
