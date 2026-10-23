# 2026-10-23 每日專題驗收

- 選題：選題庫「熱炒店下酒菜」，縮為家庭一個爐口的備料與器材安排，ID `home-stir-fry-menu`。今日只新增這一篇。
- 基準 main：`2333183e6f4a68fb6bc425596576809ccefe191e`。起工時 open PR 查詢為空，遠端分支未見今日專題；main 19 篇專題全 draft:false。辦桌、小吃雖選題庫狀態落後，但實際已發布，沒有重選；無待續的每日草稿。
- 日期：`2026-10-23T15:16:00+08:00`，沿用現行完整時間戳語義；draft:false、editorialLayout:true。
- 文字：去除圖片 alt、Markdown URL 後含 1552 個中文字、約 1806 個純文字字元。標題、summary、H2 與正文均按現有 de-ai-voice 逐句人工檢查；repo 未提供 humanize-writing 或獨立文風 checker。
- 去腔調：刪掉不自然的選肉推論，避免翻案句、排比警語、本文聲明與空泛結論；只在實際動作保留生熟分開、74°C 與不同配方不可混接的條件。沒有捏造試作、療效、歷史或整桌耗時。
- 臺灣用詞：原始 recipe 與採用來源已用臺灣用語，本篇沒有實際跨地域詞彙轉換；維持韭菜花、豆豉、皮蛋、蒜泥、米酒、粗地瓜粉、烘焙紙、鑄鐵鍋等。
- 來源：五個 primary 已讀全文；楊桃兩頁受限，不冒稱重核。詳見 research.md 的完整逐段證據與界線。
- 圖：正式 image_gen 工具生成 1 封面 + 3 正文圖，逐張讀像素。封面第一版過細且帶多餘山景，採第二版；雞腿第一版皮面方向不可靠，棄用，改為醃漬備料第二版。每圖均未超過三次，循序生成。
- 原 PNG 僅留本機 .scratch/daily-topic-20261023/originals，不提交。只有本篇 WebP 四張提交，原生 cwebp/dwebp 1.5.0 + repo img.mjs 轉檔/解碼。
- 實際像素 alt：雞腿三片生雞帶黑胡椒；韭菜花段、蒜末、辣椒片、皮蛋丁與豆豉；裹粉生蚵、蒜泥醬與煮水鍋分開。拒用不可靠的皮面壓重圖，不把圖畫成新的操作指令。
- 封面符合泛稱居家簷下灶腳、韭菜花和蒜頭；無可辨地標或未查證歷史場景。已核 WebP 成品與實際 64×43 封面縮圖，灶腳、爐與前景綠白色塊可辨。
- 工具鏈與限制見 toolchain.md。正式 Playwright Chromium 不存在，系統 Chromium 實啟受環境限制；不弱化測試，不拿 CI 代替實頁人工目視。
- 本機初次 pnpm check 因巢狀 pnpm 指到系統 11.25.0 失敗（非內容錯誤）；已用 /tmp 本機 wrapper 固定 pnpm12.1.0，將重跑完整 gate。
- 本機單元：1260 項中 1259 通過、1 失敗；唯一失敗為既有 topic-figure-pilot 的官方 Chromium 缺檔，非新內容斷言失敗。
- overlap：三份已發布相關菜譜均 OK，沒有 COPIED。
- format/types/production build、content --launch、E2E、pre-push merge check：驗證中，最後結果以實際 log 及 exact-head CI 為準。
- PR、merge、既有 workflow 部署、正式 body/四圖/list/sitemap：尚待驗證。不執行真實部署命令，不改 code/config/權限，不碰菜譜或其他圖片批次。

## 圖片成品量測

| 檔案 | 尺寸 | bytes |
| --- | --- | --- |
| hero.webp | 1536×1024 | 139000 |
| chicken-marinade.webp | 1536×1024 | 117318 |
| chive-prep.webp | 1536×1024 | 188758 |
| oyster-prep.webp | 1536×1024 | 87540 |

PNG 目視後採用；轉出的 WebP 以 Sharp 讀 metadata、原生 dwebp 完整解碼。封面縮成實際64×43後再以 nearest 放大核對，與全尺寸分開檢視。
