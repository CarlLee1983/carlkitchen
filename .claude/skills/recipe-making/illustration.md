# 插畫

全站料理圖是同一種手繪水彩風格，規格與理由見 `.scratch/recipe-mvp/issues/06-homepage-direction.md`〈圖片風格規格〉。固定的風格段與禁止段在 [style.txt](style.txt)，由 `scripts/gen.sh` 自動帶入，每張圖只需寫英文構圖描述。

生圖靠本機的 `codex` CLI（`codex exec` 呼叫它的生圖工具），一張約 40–60 秒。

## 產圖

```sh
.claude/skills/recipe-making/scripts/gen.sh <scratchpad>/recipes/<識別值> <檔名> "<英文構圖描述>" [參考圖1] [參考圖2]
```

PNG 原圖與預覽圖只放 scratchpad。Bash 工具 timeout 設 330000、前景執行；腳本本身 300 秒逾時。逾時或沒產檔就重試一次，仍失敗就停下回報實際輸出。互不相依的圖最多同時開兩個呼叫。

依序產生，讓後面的圖有參考可對齊：

1. **`hero` 成品圖**，不附參考圖。構圖：盛在素色陶瓷盤或碗，約 45 度俯視，主體略偏一側約占畫面六成，四周留白不貼邊。畫面只有盛裝的盤或碗，構圖描述結尾加 `No utensils: no chopsticks, no spoon, no fork, nothing beside the plate.`。
2. **`ingredients` 材料合照**，附 `hero.png`。正上方俯視平鋪、彼此分開；逐項寫 `exactly N <品項，含切法>`，調味料畫成小碟或小瓶，結尾加 `Nothing else: no extra vegetables, no utensils, no other items.`。品項與數量要和材料清單一致。
3. **`step-N` 步驟圖**，只畫該步完成時的狀態。備料步驟（洗、切、泡、醃、調醬汁，下鍋之前的步驟）每一步都要有圖，再加 2–3 個關鍵烹調步驟。備料圖用木砧板加菜刀、或素色瓷碗呈現。第一張有鍋具的步驟圖附 `hero.png`；之後的步驟圖附 `hero.png` 加那張鍋具圖，鍋具才會一致。檔名的 N 對應 YAML 中的步驟序號。

構圖描述明確寫出切法（丁、圈、片、塊），每張都用同一種寫法，否則各圖會畫成不同切法。鍋柄與主體不貼邊，首頁與卡片會裁切。

## 目視檢查

每張產出後 Read 它的 `.preview.jpg`，逐項確認：沒有文字、數字、浮水印或人臉；成品圖沒有餐具；食物沒有表情；品項、數量、切法、熟度與 YAML 文字一致；和同組其他圖的線條、上色、背景、鍋具一致。不符就重產，同一張最多 3 次；仍不符時保留最接近的一張，讓 alt 依圖描述，並把落差列進 PR 的「圖文小落差」。

## 轉檔

```sh
node .claude/skills/recipe-making/scripts/img.mjs webp <scratchpad>/recipes/<識別值>/<檔名>.png content/recipes/<識別值>/<檔名>.webp
```

輸出 1536×1024、不超過 300 KB 的 WebP，這是 `pnpm check:content` 檢查的規格。修改既有菜譜時若手上只有 WebP，可直接把 WebP 當參考圖傳給 `gen.sh`。
