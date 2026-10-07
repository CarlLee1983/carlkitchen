# 來源：候選清單與讀取

## 提候選清單

站主沒給網址時，AI 先找候選、站主勾選後才製作。

1. 每道菜找兩個候選網址，偏好出版社或食譜站（楊桃美食網、愛料理等）。逐一打開確認：HTTP 200、不需登入、確實是這道菜、材料有明確用量、步驟是完整文字（影片頁要附文字食譜）。
2. 寫成 `.scratch/<批次名>/source-candidates.md`，格式照 `.scratch/launch-content/source-candidates.md`：開頭〈如何核准〉、總表（識別值、菜名、分類、蔬菜、蛋白質），每道菜一節，列分類與標記提議各附理由，每個網址前放 `- [ ]` 並附一行摘要（出處、份量、火候時間、用量是否齊全、步數、與菜名不同之處）。摘要是重點整理，不抄原文。
3. 回報站主清單路徑，停下等勾選。站主改成 `- [x]` 的網址才是核准來源；整道菜都沒勾就不收錄。

## 讀取來源

- **楊桃美食網（ytower）是 Big5 編碼**，一般網頁擷取工具會讀錯，連菜名都可能錯。一律用 curl 抓原始 HTML 再轉碼：

  ```sh
  curl -sL -A 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130 Safari/537.36' '<網址>' | iconv -f BIG5 -t UTF-8 -c
  ```

  頁面內嵌的 JSON-LD（`recipeIngredient`、`HowToStep`）最乾淨。楊桃的頁面不標份數，只標出處書名或期別。

- 其他站：curl 後去掉 script 與標籤，找材料與步驟段落。
- 抓下的 HTML 放 scratchpad，不進儲存庫。
- 多個來源衝突時選一種做法，在 PR 說明取捨；沒採用的核准來源不寫進 `content/sources/`。
