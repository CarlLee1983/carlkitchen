# 01: 專題頁曳光彈

**What to build:** 讀者能從導覽列的「專題」進入列表頁，看到已發布的專題依發布日期由新到舊排列，點進去讀到完整的 Markdown 內文。站主用 Markdown 加 frontmatter 寫專題，草稿只在開發伺服器出現，正式建置看不到。內容根目錄以 `TOPICS_DIR` 切換，比照 `RECIPES_DIR`，e2e 用測試用固定專題。規格見[專題規格](../spec.md)。

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] 專題 schema 以工廠函式建立，欄位為 `title`、`summary`、`draft`、`publishedAt`；識別值格式規則和菜譜相同；有單元測試
- [ ] 內容根目錄預設為正式內容，可用 `TOPICS_DIR` 切換；測試用固定專題至少三篇，其中一篇草稿
- [ ] `/topics/` 只列已發布專題（開發模式含草稿），依 `publishedAt` 由新到舊，每張卡片顯示標題、短介、發布日期
- [ ] `/topics/<識別值>/` 顯示標題、發布日期與內文，小節標題層級正確
- [ ] 導覽列在「食材介紹」之後有「專題」，連到列表頁；首頁不變
- [ ] 正式建置不產生草稿專題頁
- [ ] e2e 涵蓋列表排序、文章頁內容、導覽、草稿不存在、手機寬度沒有橫向捲動、無障礙檢查
- [ ] `pnpm check && pnpm test && pnpm test:e2e` 通過；`AGENTS.md` 補上專題目錄與 `TOPICS_DIR`
