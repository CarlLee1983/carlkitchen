# 02: 第一篇食材條目從草稿到公開

**What to build:** 讓站主能依已核准來源製作、預覽並審閱一篇食材條目；核准後，讀者可在靜態頁面閱讀其食材知識並前往相關菜譜。這篇代表條目同時打通內容資料、圖片、草稿隔離、來源紀錄、輸出檢查與讀者頁面。

**Blocked by:** [食材介紹的閱讀路徑與頁面原型](../../logo-ingredient-guide/issues/03-guide-prototype.md)；[食材條目的內容契約與時令表述](../../logo-ingredient-guide/issues/04-content-contract.md)；[食材內容的來源紀錄與審閱流程](../../logo-ingredient-guide/issues/05-editorial-workflow.md)；[Logo 與食材介紹的實作邊界及驗收標準](../../logo-ingredient-guide/issues/07-handoff-criteria.md)。無本目錄內部依賴。

**Status:** done

**本票定案：** 首篇為高麗菜；圖片可選；必填欄位與時令範圍見[內容契約](../../logo-ingredient-guide/issues/04-content-contract.md)，核准來源與編審規則見[編審流程](../../logo-ingredient-guide/issues/05-editorial-workflow.md)。本票只做可直接造訪的 `/ingredients/cabbage/` 條目頁，連到已發布的 `/recipes/stir-fried-cabbage/`；章節入口、菜譜反向連結與站內搜尋留給後續票。編審時首篇保持草稿，站主審閱全文後才切換發布。

站主已審閱並核准高麗菜文字與先前核准的三頁來源；首篇已切換為公開。手機與桌面正式頁面截圖見本目錄上層 `prototypes/cabbage-public-*.png`。

- [x] 一篇符合定案內容契約的食材條目可在本地草稿預覽；正式建置不輸出草稿頁、草稿連結或來源紀錄。
- [x] 站主核准條目文字後，將首篇改為發布，正式建置會產生可直接造訪的頁面並連到清炒高麗菜菜譜。
- [x] 缺少必填內容、核准來源或有圖但缺圖片說明時，內容檢查以可定位的訊息阻擋發布。
- [x] 高麗菜產期、選用、處理、保存與用途均依已核准來源撰寫，標明臺灣適用範圍與年度變動。
- [x] 單元測試覆蓋內容檢查邊界，瀏覽器測試覆蓋草稿隔離與公開頁面的讀者流程；必要檢查通過。
