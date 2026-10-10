# 插畫

全站料理圖是同一種手繪水彩風格。**規格只寫在** `.scratch/recipe-mvp/issues/06-homepage-direction.md`〈圖片風格規格〉：畫風、構圖、哪些步驟要有圖、禁止事項都以那一節為準，改規格只改那裡。本檔只寫怎麼產出符合規格的圖。

固定的風格段與禁止段在 [style.txt](style.txt)，由 `scripts/gen.sh` 自動帶入，每張圖只需寫英文構圖描述。生圖靠本機的 `codex` CLI（`codex exec` 呼叫它的生圖工具），一張約 40–60 秒。

## 決定要畫哪些圖

先讀 06〈構圖〉。要找出現有菜譜的缺圖步驟，用：

```sh
node .claude/skills/recipe-making/scripts/img.mjs steps [步驟文字關鍵字]
```

每道菜一列，`■` 是有圖、`□` 是缺圖；給關鍵字（例如 `汆燙`）時只列出文字含該字的步驟。

## 寫構圖描述

每張圖動筆前，先從 YAML 材料清單抄出這張圖會出現的每項材料的 `name` 與 `note`，把部位、切法、乾或鮮、帶骨與否照抄成英文寫進描述（例如 `chicken thigh chopped into small bite-sized chunks, NOT whole wings`、`small dried shrimp, NOT fresh prawns`）。各圖的同一項材料用同一種寫法，否則會畫成不同切法。

各類圖的提示詞寫法：

1. **`hero` 成品圖**：先依 06〈構圖〉決定容器，湯畫敞口湯鍋；其他料理符合連鍋上桌或整鍋更能呈現特色的條件時才畫鍋，否則畫盤碗。提示詞寫明容器、完整成品與可見的主要食材；畫鍋時寫明它已離火、鍋中是可上桌的成品，並與步驟圖的鍋具一致。參考圖附 `ingredients.webp`（新菜譜還沒有時不附）。描述結尾加 `No utensils: no chopsticks, no spoon, no fork, nothing beside the vessel.`。
2. **`ingredients` 材料合照**：附 `hero.png`。逐項寫 `exactly N <品項與 note>`，結尾加 `Nothing else: no extra vegetables, no utensils, no other items.`。
3. **`step-N` 步驟圖**：N 是 YAML 中的步驟序號。備料圖寫木砧板加菜刀、素色瓷碗，或汆燙後的不鏽鋼瀝水籃。參考圖附 `hero.png`，再附一張同菜譜已有的同類器具圖（砧板、碗或鍋），器具才會一致。

## 產圖

```sh
.claude/skills/recipe-making/scripts/gen.sh <scratchpad>/recipes/<識別值> <檔名> "<英文構圖描述>" [參考圖1] [參考圖2]
```

PNG 原圖與預覽圖只放 scratchpad。Bash 工具 timeout 設 330000、前景執行；腳本本身 300 秒逾時。逾時或沒產檔就重試一次，仍失敗就停下回報實際輸出。gen.sh 自己會排隊（全機最多同時兩個，額滿印「等待生圖名額…」），Bash timeout 仍設 330000，排隊等待超過時工具會轉背景。參考圖可以是 PNG 或 WebP。

## 目視檢查

每張產出後 Read 它的 `.preview.jpg`。完成條件：06〈構圖〉與〈禁止事項〉的每一條都成立，而且你抄下的每項材料的部位、切法、數量都和圖一致。不符就重產，同一張最多 3 次；仍不符時保留最接近的一張，讓 alt 依圖描述，並把落差列進 PR 的「圖文小落差」。

## 轉檔

需要系統 WebP 工具（`cwebp` 與 `dwebp`）：macOS 用 `brew install webp`，Debian／Ubuntu 用 `sudo apt-get install webp`。轉檔工具不會自動安裝或改用其他編碼器。

```sh
node .claude/skills/recipe-making/scripts/img.mjs webp <scratchpad>/recipes/<識別值>/<檔名>.png content/recipes/<識別值>/<檔名>.webp
```

整組圖片已逐張目視通過時，可用一個命令轉檔：

```sh
node .claude/skills/recipe-making/scripts/img.mjs webp-batch <scratchpad>/recipes/<識別值> content/recipes/<識別值>
```

批次只處理來源資料夾第一層的 PNG，按檔名排序、循序轉成同名 WebP。來源資料夾應只放這次要採用的原圖；預覽 JPEG 不會被處理。沒有 PNG 時回報錯誤。

標準尺寸直接用 cwebp；其他尺寸先用 Sharp 置中裁切、縮放一次。品質從 80 開始，每次降 5，最低 30；確認輸出為 1536×1024、大小不超過 300 KiB（307200 bytes），並由 dwebp 完整解碼驗證後才替換目的檔。失敗時保留該張既有目的檔並清除暫存檔；批次在第一張失敗處停止，先前成功的檔案保留。修正失敗原因後可重新執行整批。

完成條件：命令成功，每張成品目視確認裁切與畫質，並通過 `pnpm check:content`。資源量測與採用理由見 [轉檔量測紀錄](../../../docs/webp-conversion.md)。
