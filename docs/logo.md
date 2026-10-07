# Logo 資產

[`logo-mark.svg`](../public/logo-mark.svg) 是「盤與葉」圖形的唯一來源，供全站頁首與 favicon 共用。完整英文站名由頁首文字呈現，圖形的替代文字留空，避免螢幕閱讀器重複朗讀。

調整圖形時直接編輯這份 SVG，並在桌面、手機導覽列與瀏覽器頁籤的小尺寸情境檢查線條和對比。SVG 的米白圓角底與網站背景同色，讓炭灰盤線在深色瀏覽器分頁也可辨識。

執行 `pnpm test` 會檢查 16px 圖形在明暗背景的輪廓對比，並產生 `test-results/logo-favicon-16-light.png` 與 `test-results/logo-favicon-16-dark.png` 供目視檢查。正式定稿仍應連同實際桌面、手機頁首一起看。
