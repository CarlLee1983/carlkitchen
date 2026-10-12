# 每日專題查核紀錄：2026-10-12

- 範圍：候選〈客家菜的鹹香肥〉，以保存食與兩道家常菜切入；不提供自製醃漬安全指引，不推論族群體質。
- 基底：7ce164aef5f494348acbf21069c04f5c64f4b18d。
- 去重：10 篇 topic.md 均 draft:false，無 2026-10-12 新專題；open PR 無結果。topic 分支搜尋 14 筆，均既有已發布主題/規格/互動圖分支，沒有此題。
- 環境：使用者指定雲端；無 saved coding environment，獨立雲端工作區。Node 24.19.0、pnpm 12.1.0，原生 libwebp 1.6.0。
- 授權：2026-10-12 每日專題任務明確允許自行選題與查核來源，檢查通過後 ready/merge/既有部署；優先於 repo 舊逐篇核准與不合併說明，不修改規則檔。
- pnpm install --frozen-lockfile：通過。

## 來源取捨與未採用

- 既有兩道菜的楊桃來源若無法讀原文，不宣稱重新驗證本站配方；只作站內既有版本連結。
- 文化記錄中的營養、生理、療效與反覆加熱保存主張不採用。

## 圖片

本篇全新識別值，四張原創圖片各自記錄目前嘗試，最多同時兩張；不改舊篇圖片。

## 驗收

待完成。

## 獨立審稿

- 詞典歸因修正：教育部僅釋菜脯為蘿蔔乾，日曬/灑鹽/甕罐記錄改歸國史館。其他文化、具名示範及圖文抽查通過。
- 大溪頁 web 初次 timeout；同網址 curl 完整取得 HTML，已讀南興里陳鍾明原段落，非搜尋摘要。
- 來源詞彙：肉末→絞肉；豆乾→豆干；蔥→青蔥（以本站配方名稱為準）。
- 去 AI 味：直接描述具名版本的材料/工序，不寫族群本性、唯一正統、療效與個人心得。
- 不採用：文化來源中的吃鹹補體力、反覆回鍋保存說法、菜脯治咳嗽例句；阿基師醬油表與步驟次數不一致，因此不抄寫比例。
- 四張圖片各生成一次，無重試；全圖1536×1024，原生cwebp q80，dwebp完整解碼通過。封面306812 bytes，正文98862/263454/131530 bytes，均小於307200 bytes。
- 圖文限制：食材比較圖不表示份量或自製保存步驟；炒鍋圖只表示肉/豆干的前段，鍋柄/鍋鏟柄延伸到邊緣，關鍵食材完整。封面為一般菜田意境，非歷史或指定農場復原。
- 工程首次check因Astro環境目錄與telemetry副作用受阻；只在本工作程序指定XDG_CONFIG_HOME，並確認已安裝@astrojs/telemetry的isDisabled/record會受ASTRO_TELEMETRY_DISABLED=1抑制，再停送遙測重跑必要檢查。不修改永久設定或repo規則，未削弱檢查。

## 站內配方補充對照

- 客家小炒段的本站版本：content/recipes/hakka-stir-fry/recipe.yaml，基底7ce164a；菜脯蛋段：content/recipes/preserved-radish-omelette/recipe.yaml。兩份內容只作既有站內版本說明，未新添操作或替換原來源。公開網址不放內部核准來源清單，以免canonical URL被誤當核准來源洩漏；段落的額外事實仍分別映到已完整讀取的外部示範。

## 最終狀態與必要阻礙

- 圖文完成，純段落約1535個中文字（不計標題、alt）；正文外加1封面、3教學插畫，64×43封面縮圖及卡片裁切已目視。
- 暫維持 topic draft:true，選題庫為進行中。僅開 draft PR，未 ready、未合併、未部署；今天不計為已發布的一篇。
- 非草稿測試建置曾產生本篇HTML、四圖、Pagefind與Sitemap，check與check:content --launch通過；切回草稿後再跑最後檔案檢查。
- 完整pnpm test本機1158/1159通過，唯一未過為既有topic-figure-pilot需Chromium執行檔；官方Playwright下載0 MiB/損壞ZIP，未改測試或使用替代瀏覽器冒充。此項與E2E待精確PR CI驗證。
- 本篇實頁視覺：pnpm preview使用repo既有ASTRO_PREVIEW_BACKGROUND=1。host 0.0.0.0遇uv_interface_addresses系統限制；最小loopback127.0.0.1顯示ready，但獨立curl及全新雲端瀏覽器頁仍connection refused。舊錯誤頁操作另曾被URL policy拒絕，未繞過。桌機與手機段落/首字實頁目視未完成，不能用通用CI E2E代替。
- 待續：可用、合法的本篇預覽環境完成桌機/手機目視，才設draft:false並更新真實完成時間、重跑最後檔案檢查，確認精確head CI，再依使用者授權ready/merge與正式頁/全圖/列表/Sitemap驗收。
