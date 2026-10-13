# 01: `figure` 區塊產出靜態互動圖（tracer）

**What to build:** 站主在專題 Markdown 寫一個語言標記為 `figure`、內容為圖識別值的程式碼區塊，建置後該處出現一張配合站上畫風的等角互動圖（此票只到靜態呈現）：關鍵狀態的 SVG、全部階段的 `<ol>`、`figcaption` 與替代文字。圖上文字與數字來自同專題資料夾的 `<圖識別值>.figure.yaml`。依據：規格 `.scratch/topic-interactive-figures/spec.md`、ADR 0011。

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] anatomy kit 只複製試點用到的核心與其 CSS 進 vendor 目錄，附上游 `LICENSE` 與 README（上游網址、commit、複製的檔案、手動同步方式）；不改 kit 幾何程式
- [ ] `.figure.yaml` 有 schema（`alt`、`caption`、`duration`、`keyStage`、`variants`、`stages`；階段可為區間、讀數可依 variant 不同），不符時建置失敗並指出檔案
- [ ] `peanut-frying` 繪圖模組以 kit 畫等角炒鍋、油面、花生與氣泡，帶膜／去膜與各階段以 SVG 狀態類別切換外觀；配色、字體只覆寫 CSS 變數，採站上淺色 token
- [ ] 專題 hast 外掛把 `figure` 程式碼區塊換成 `figure` 元素，SVG 預設畫 `keyStage`；控制項、讀數、階段清單帶 `data-pagefind-ignore`，只有 `figcaption` 進索引
- [ ] 引用不存在的圖識別值（缺資料檔或繪圖模組）時建置失敗，訊息含專題與圖識別值；一般程式碼區塊、首字放大與正文圖行為不變
- [ ] 固定專題 `knife-skills` 放一張互動圖（資料標「固定資料」）
- [ ] 單元測試（沿用 topic-markdown 的 satteri 渲染）涵蓋上述轉換與錯誤
- [ ] e2e：固定站台上圖與階段清單可見、手機寬度無橫向捲動、a11y 檢查通過
- [ ] `pnpm check && pnpm test && pnpm test:e2e` 全綠
