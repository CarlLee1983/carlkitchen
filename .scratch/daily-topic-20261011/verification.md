# 2026-10-11 每日專題驗收

## 範圍與去重

- 臺灣日期：2026-10-11；本次只新增 three-cup-family 一篇。
- 起點 main：ce6c9d07e15d5982daff35affba979c42aaf460c。9 篇既有專題皆已發布，沒有 main 內待續專題草稿。GitHub 開啟 PR 為空；遠端分支與 topic/source commit 記錄未見同題或今日專題。
- main 既有 Deploy 38117972422 成功。一般菜譜、其他圖片批次、程式與設定不在本次範圍。
- 選題來自既有候選「三杯的家族」，未擴充題庫。
- 依站主本次每日專題授權自行查核來源、完成 draft PR 後在精確 head 必要 CI 通過才轉 ready、合併，沿既有 Actions 部署。未修改專案規則。

## 插畫

正式 imagegen 逐張原創，最多兩張同時生成。四張採用圖均為 1536×1024 PNG 原圖，未放入提交；使用 repo img.mjs 與官方 libwebp 1.6.0 的 cwebp、dwebp 轉檔、完整解碼驗證。沒有改用其他 WebP 編碼器。

- hero：灶腳與庭院風景、遠景水色與樹影，近景小籃九層塔及薑。非可辨真實地點或歷史場景。第一次前景料理過大，第二次移除料理後採用。q75，263576 bytes。
- aromatics：分開擺放薑片、整瓣蒜仁、剖半紅辣椒與帶紫莖九層塔；教讀者先辨識材料，不表示一份配方的量。第一版採用。q80，154206 bytes。
- mushroom-methods：左側炸至金黃的菇塊在網杓中，右側菇塊、薑蒜辣椒在鍋中帶少量水分。比較兩個具名來源的不同前處理，非連續步驟。第一版採用。q80，198118 bytes。
- squid-finish：已拌醬透抽圈與薑蒜，九層塔、辣椒在收尾入鍋。第一版採用。q80，230034 bytes。

已逐張檢視原圖與 WebP 聯絡表；主料、狀態與 alt 對應、無文字水印、色彩與線條一致。1536×1024 直接原生編碼，不需裁切；畫面保留主要材料與容器，工具柄延伸至畫緣屬構圖，不遺漏教學狀態。封面縮圖能區分天空、瓦簷、庭院與近景綠色，無三道成品搶佔風景。

## 工具與檢查

- Node v24.19.0，pnpm 12.1.0；指定版本 frozen-lockfile install 成功。依賴下載曾有暫時 tunnel error，套件管理器重試後完整成功，未改 lockfile。
- 本機 Playwright 曾確認下載 ZIP 損壞及 system Chromium socket EPERM；依本次要求不重試安裝、不修改 sandbox。真實桌面／窄版目視驗收將用可用的正常雲端 Chrome；CI 的瀏覽器測試不冒充真實目視。
- 其餘驗證與正式部署結果由 PR 及後续發布記錄補充；本檔不預先宣稱通過。

## 已驗結果

- 正文依中文漢字計數為 1509 字（不含標題、frontmatter 與圖片替代文字）；四份全文逐段查核見 fact-check.md。
- pnpm check:overlap three-cup-family：三個站內菜譜比較均 OK，沒有 COPIED。
- pnpm test：999 個測試全過，93 suites，0 failed / skipped。第一次執行未把 WebP 工具加入 PATH，圖片轉檔測試失敗；補上本次已安裝的官方工具後完整重跑通過，未改測試。
- astro check：0 errors、0 warnings、7 個既有 hints。
- 檢查工具的第一次執行遭遙測風險攔截；後續命令明確設 ASTRO_TELEMETRY_DISABLED=1 與 WRANGLER_SEND_METRICS=false，再重跑。沒有調整 repo 設定或分享額外環境資料。
- 原圖和轉檔後四張完整尺寸 WebP 都逐張看過，另核對聯絡表。GitHub 圖片 blob SHA 與本地 git hash-object 一致。
- pnpm check：格式、型別、完整正式建置與搜尋索引均通過。10,761 張輸出圖片完成；Pagefind 收錄 257 頁。
- pnpm check:content --launch：通過，包含來源洩漏、段落、相關連結、圖片與候選池門檻。既有一般菜譜未用材料警告保留，本篇未更動一般菜譜。
- 獨立文字／來源／圖片複核：四份一手全文均可讀，逐段內容與數值符合，1509 個中文字、四圖 alt 正確，無發布阻擋項目。
- 雲端正式站 `/topics/` 已可正常讀取，發布前仍是原有九篇；本地 Astro preview 兩次未進入 ready，普通靜態 HTTP 預覽亦無法從雲端 Chrome 連入（ERR_CONNECTION_REFUSED）。未繞過環境限制，將於正式部署後以正常雲端 Chrome 查驗圖文版面；本地目視不冒稱完成。
