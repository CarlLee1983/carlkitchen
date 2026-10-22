# 2026-10-22 每日專題驗收

- 題目：絲瓜、冬瓜、苦瓜：切塊同煮，還是切片快炒，識別值 `summer-gourds`。
- 正文敘文 1,579 CJK（不含標題、alt），三節分散三張教學圖；連結三份已發布菜譜。來源與取捨見 source-check.md。
- `draft: false`、`editorialLayout: true`；`publishedAt: 2026-10-22T15:54:00+08:00`，四圖與稿件實際完成時間，非未來時間。
- built-in image_gen 逐張生成四張，沒有重試：封面市場景深與絲瓜／苦瓜、絲瓜切塊備料、冬瓜排骨電鍋組裝、苦瓜與整顆熟鹹蛋碎拌炒。原 PNG 僅留工作區，未提交。
- 原圖與最終 WebP 逐張目視。1536×1024；hero 199,992 bytes、luffa-prep 165,854、winter-melon-cooker 90,322、bitter-melon-egg 246,918；均由 repo img.mjs、官方 Debian cwebp/dwebp 1.5.0 轉檔解碼。封面色塊縮圖可辨，正文呈現實際配方切法／操作，alt 依可見狀態。
- Node 24.19.0、pnpm 12.1.0；frozen install 通過。雲端預設 pnpm 11 的巢狀指令不符 engine，已改 PATH 指定官方 pnpm 12.1.0 binary，未改專案設定。
- `check:overlap summer-gourds` 三菜譜全部 OK。
- Playwright 官方 Chromium v1243 下載回無效 ZIP，安裝失敗；不改瀏覽器安全旗標或測試。local unit/browser 結果、exact-head CI 與部署狀態將以實際執行回報。
- 本機 unit 1,259 通過、1 失敗，唯一為 Playwright 執行檔缺失；其餘測試通過（含 cwebp 工具測試）。本地 E2E 將另實際嘗試，完整瀏覽器結果以 exact-head CI 為準，不能把未跑的項目稱通過。
- 正式頁目視會用雲端既有瀏覽器再檢查。此紀錄是合併前狀態，不預先宣稱 CI、部署或正式資源已成功。
