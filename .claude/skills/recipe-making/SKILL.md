---
name: recipe-making
description: CarlKitchen 菜譜的製作流程：從來源核准、擷取、寫 YAML、繪製插畫到送審 PR。新增菜譜、修改已發布菜譜或重製插畫時使用。
---

# 菜譜製作

一份菜譜的成品是三樣東西，都以識別值對應：

- `content/recipes/<識別值>/recipe.yaml` 與同資料夾的 WebP 插畫
- `content/sources/<識別值>.yaml`：`urls:` 列出實際用到的核准網址
- 一個送站主審閱的 PR，內文列出所有推論與疑點

站主合入 PR 才算發布。代理只推送工作分支、開 PR，合入留給站主（見 `AGENTS.md`〈代理權限〉）。

## 分支

- **新增菜譜**：照〈步驟〉從頭做。一次多道菜時，另讀 [batch.md](batch.md)。
- **修改已發布菜譜**：直接改 YAML，照〈步驟〉3 起做。材料品項、數量、切法或步驟狀態有變時，把畫到它的圖照 [illustration.md](illustration.md) 重製；用現有 `hero.webp` 當參考圖。新事實仍須來自核准來源。
- **只重製插畫**：照 [illustration.md](illustration.md)，再做步驟 6、7。

## 步驟

1. **開工作分支**：從最新 `main` 開 `content/<簡述>` 分支。完成條件：`git branch --show-current` 不是 `main`。
2. **取得核准來源**：站主給了網址就直接用；沒給就照 [sourcing.md](sourcing.md) 提候選清單，**停下等站主勾選**。完成條件：每道菜至少一個站主核准的網址。
3. **擷取事實**：照 [sourcing.md](sourcing.md)〈讀取來源〉抓下來源，抽出材料、用量、步驟、火候、時間。完成條件：做法每個動作都有來源事實對應。
4. **寫菜譜**：先用 `recipe-writing` skill 寫文字，再填 YAML。格式以既有菜譜為範本（例如 `content/recipes/tomato-egg/recipe.yaml`），規則以 `src/content/recipe-schema.ts` 為準。圖片未齊時填 `draft: true`。同時寫 `content/sources/<識別值>.yaml`。
5. **繪製插畫**：照 [illustration.md](illustration.md) 產成品圖、材料合照、每個備料步驟的圖與 2–3 張關鍵烹調步驟圖，轉成 WebP 放進菜譜資料夾，YAML 補上 `src` 與 alt，改成 `draft: false`。完成條件：每張圖都過目視檢查，alt 描述的是圖中實際畫的內容。
6. **驗證**：依序跑 `pnpm build && pnpm check:content`、`pnpm check`、`pnpm test`、`pnpm test:e2e`，全綠才提交。補一次 `pnpm check:content --launch` 確認候選池門檻仍達標（不阻擋 PR，但結果寫進 PR）。用 `node .claude/skills/recipe-making/scripts/img.mjs sheet content/recipes/<識別值> <scratchpad>/<識別值>.jpg` 產縮圖總表，Read 看過整組一致。
7. **提交與送審**：以 `feat: add <菜名英文> recipe` 之類的 conventional commit 提交；準備好送審時推送分支、開 PR。PR 內文必須列出〈送審清單〉每一類的實際內容（沒有就寫「無」）。完成條件：PR 已開、CI 綠燈，回報站主 PR 網址。

## 寫進 YAML 的界線

這些是首批 19 道審稿時站主挑出的問題，寫 YAML 時照做：

- 只寫來源有的事實。處理狀態（「已去鱗」）、熟度訊號（「發出滋滋聲」）、份量、切法，來源沒寫就留空，在 PR 標出。
- 份數來源沒寫時，依主料推估並在 PR 標「推估」。
- 用量依來源數字直接換算（例如減半）寫成公制；來源寫「少許／適量」時保留原文放 `note`。湯匙換成克屬非直接換算，沿用 1/2 湯匙＝6 g，並在 PR 列出。
- 品牌品項改寫成一般名稱（龜甲萬御釀醬油→醬油、烹大師→高湯粉）。
- `text`、`summary`、`tip` 是純文字輸出，寫成不帶 Markdown 記號的句子。
- 分類與標記：湯一律 `vegetable: false`、`protein: false`；非湯料理依主角是蔬菜或蛋白質標記，可兩者皆是。`mealCandidate` 預設 `true`，不適合當家常配菜時才填 `false` 並說明。
- 識別值是資料夾名，也是網址，合入後不改。

## 送審清單

PR 內文的〈審稿請特別看〉逐類列出：份數推估、非直接換算的用量、自行補上可刪的內容（別名、切法）、圖文小落差、只用單一來源的菜、品牌改寫、標記與候選提議的理由。格式參考 PR #12。
