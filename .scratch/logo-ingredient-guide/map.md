# CarlKitchen Logo 與食材介紹：決策地圖

Label: wayfinder:map
Status: open

## Destination

完成可交付實作的 Logo 方向與食材介紹章節規格：確定視覺方案、食材條目內容與時令表述、頁面與菜譜的關係、編審流程及驗收標準。本輪只釐清決策與製作原型，不修改正式網站或發布內容。

## Notes

- 本地規劃分支 `plan/logo-ingredient-guide` 從 `main` 建立，與其他工作目錄隔離。
- 現有風格為米白底、炭灰字、細線、明體標題與手繪水彩料理插畫；Logo 以現有英文站名 `CarlKitchen` 為主，原型需比較純文字與簡潔圖形，並檢視手機導覽列。
- 食材介紹以單一食材條目為主，首批考慮臺灣時令蔬菜、常用辛香料及調味料；料理做法連至菜譜，避免重複完整菜譜。
- 食材內容沿用先核准公開來源、AI 整理、站主逐篇審閱後才發布的原則；研究票只整理候選來源與不確定性，不擅自核准來源。
- 本地 Markdown 為 Wayfinder tracker；開放票見 `issues/`，`Blocked by` 表示依賴。後續每次 Wayfinder session 至多解決一張非研究票。
- 討論產品決策時使用 `grilling` 與 `domain-modeling`；視覺與閱讀路徑使用 `prototype`；跨工作目錄的資料查證使用 `research`。參照既有[首頁視覺決策](../recipe-mvp/issues/06-homepage-direction.md)與[內容審閱流程](../recipe-mvp/issues/03-local-ai-review-workflow.md)。

## Decisions so far

<!-- 已解決票的名稱、連結與一句摘要；完整決定只留在票內。 -->

- [臺灣時令與常用配料的資料來源盤點](issues/02-source-landscape.md)：完成第一手候選來源與適用限制盤點；所有來源仍待站主核准，產期、栽培與加工品差異須逐項核對。
- [Logo 的識別方向與使用情境](issues/01-logo-direction.md)：站主選定 B「盤與葉」，保留完整英文站名，細線盤緣與綠葉圖形可單獨用於小尺寸圖示。

## Not yet specified

- 首批具體條目選定後，若個別食材出現一般內容契約無法涵蓋的產地或加工差異，再界定其專屬規則。
- 在 Logo 與章節原型定向後，再辨認是否需要不同尺寸或不同媒介的特殊規格，以及食材插畫是否需要獨立於菜譜插畫的細則。

## Out of scope

- 本輪不實作正式 Logo、網站頁面、內容集合或食材文章，不部署網站；站主確認規格後另行實作。
- 不建立另一套完整菜譜或動態季節推薦系統。
