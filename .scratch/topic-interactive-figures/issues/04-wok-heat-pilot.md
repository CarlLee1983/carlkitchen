# 04: 〈熱鍋與起鍋油〉試點上線

**What to build:** 讀者在〈熱鍋與起鍋油〉的「炸花生從冷油開始」小節看到並操作炸花生時間軸互動圖；圖上只有核准來源支持的事實，既有插畫與正文不變。依據：規格 `.scratch/topic-interactive-figures/spec.md`。

**Blocked by:** 02（互動執行期）、03（內容檢查把關互動圖）

**Status:** ready-for-agent

- [ ] 真實 `peanut-frying.figure.yaml`：冷油蓋過花生開小火、冒小泡與蒸氣與劈啪聲、約 7 到 12 分鐘、帶膜薄膜轉深紅褐且劈啪聲停／去膜表面淡黃、最後 1 到 2 分鐘可關火靠餘溫、放涼後才酥脆；不標溫度；替代文字描述圖中實際內容
- [ ] 來源紀錄加 `figures` 對照（The Woks of Life〈Wok-Fried Peanuts〉、Omnivore's Cookbook〈Szechuan Spicy Peanuts〉，以實際用到的事實為準），並在 PR 列出每項圖上事實對應的來源
- [ ] `figure` 區塊插在既有炸花生插畫附近；正文文字與既有插畫不改
- [ ] 依真實內容調整畫面；保存桌機、手機截圖（含無 JS 與帶膜／去膜各一張）供站主驗收
- [ ] `pnpm build && pnpm check:content` 對正式內容通過
- [ ] `pnpm check && pnpm test && pnpm test:e2e` 全綠，`pnpm check:merge` 通過
- [ ] 工作分支推送並以 `gh pr create --draft` 開 PR；不合入
