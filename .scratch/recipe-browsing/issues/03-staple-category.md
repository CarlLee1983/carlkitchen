# 03: 主食分類

**What to build:** 站主可以把炒麵、炒飯、義大利麵、湯麵的菜譜分類寫成「主食」。主食出現在首頁篩選列的「主食」選項下，清單和菜譜頁的分類標籤顯示「主食」，配一桌永遠不會抽中主食。站主若把主食標成配菜候選，或讓主食帶蔬菜菜、蛋白質菜標記，建置會失敗。規格見 [01-browsing-spec](01-browsing-spec.md)，決策見 [ADR 0002](../../../docs/adr/0002-staple-as-category.md)。

**Blocked by:** 02（沿用其篩選模型與選項隱藏規則）

**Status:** ready-for-agent

- [x] 分類列舉為「非湯料理」「主食」「湯」
- [x] schema 規則：主食的 `vegetable`、`protein`、`mealCandidate` 都必須為假，草稿同樣適用，錯誤訊息附欄位路徑
- [x] 篩選列在有已發布主食時出現「主食」選項，位置在蛋白質菜與湯之間；主食的篩選值為 `staple`
- [x] 配一桌候選池只納入非湯料理與湯；即使主食資料被標成候選也會排除；部署前候選池門檻計數不含主食
- [x] 固定菜譜新增一道已發布主食；Playwright 驗證「主食」選項只回這道菜、清單標籤顯示「主食」、配一桌不會抽中它
- [x] `tests/home.test.ts`：沒有主食時不顯示主食選項，有主食時顯示
- [x] `tests/recipe-schema.test.ts`、`tests/meal-planner.test.ts` 涵蓋上述規則
- [x] `recipe-making`、`recipe-writing` skill 說明主食的判定方式（湯麵歸為主食）與三條分類規則
- [x] `06-homepage-direction` 中舊的分類切換描述旁加一行註記，指向本規格
- [x] `pnpm check && pnpm test && pnpm test:e2e` 全部通過
