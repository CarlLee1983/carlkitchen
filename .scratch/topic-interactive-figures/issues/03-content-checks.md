# 03: 內容檢查把關互動圖

**What to build:** 站主跑 `pnpm check:content` 時，互動圖和正文段落一樣受核准來源規則把關（ADR 0009、0011）：圖缺資料、缺來源對照、對照網址未核准、留下孤兒資料檔，或草稿專題的圖出現在輸出，都會被擋下。依據：規格 `.scratch/topic-interactive-figures/spec.md`。

**Blocked by:** 01（`figure` 區塊產出靜態互動圖）

**Status:** ready-for-agent

- [ ] 專題來源紀錄新增選填 `figures`（每筆 `id`、`urls`）
- [ ] 已發布專題正文引用的每個圖識別值：有 `.figure.yaml` 且通過 schema、在 `figures` 有對照、對照網址都列在 `sources`；否則各自回報問題
- [ ] 專題資料夾裡沒被正文引用的 `.figure.yaml` 回報為孤兒
- [ ] 草稿專題的互動圖內容不得出現在建置輸出
- [ ] `draft-topic` 固定資料放一張互動圖；`knife-skills` 固定資料的來源紀錄補 `figures` 對照
- [ ] 單元測試沿用 `runContentChecks` 與專題內容檢查的固定資料寫法，涵蓋每種問題與合法資料回傳空清單
- [ ] e2e 驗證草稿固定專題的圖不在正式站台
- [ ] `AGENTS.md`〈指令〉的 `pnpm check:content` 說明補上互動圖檢查（僅事實描述，寫作規則不在本票）
- [ ] `pnpm check && pnpm test && pnpm test:e2e` 全綠
