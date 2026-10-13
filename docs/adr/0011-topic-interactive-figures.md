---
status: accepted
---

# 專題互動圖：補充插畫、零框架、事實同源

2026-10-12，站主想在專題正文加入 [anatomy](https://github.com/wheresryan22/anatomy) 風格的等角互動圖解，讓過程類的內容（例如炸花生從冷油到起鍋）可以拖動時間觀察。試點先做〈熱鍋與起鍋油〉的炸花生時間軸。

## 決定

- 互動圖補充正文插畫，不取代插畫；只用在小節核心是「隨時間或條件改變的過程」時，一篇以一到兩張為限。
- 不引入 MDX、React／Preact 或 WebGL。anatomy 的 kit 只複製用到的檔案到 `src/vendor/anatomy/`（保留 MIT 授權與上游 commit），建置時以 Node 產出靜態 SVG，互動只用一小段原生 JS；畫風改用站上 token，只保留等角結構。
- 正文以語言標記 `figure` 的程式碼區塊引用圖識別值，由專題既有的 hast 外掛換成圖；不用圖片語法，以免與 Astro 圖片解析衝突。
- 圖上事實與正文同一套規則（ADR 0009）：資料放 `content/topics/<識別值>/<圖識別值>.figure.yaml`，來源紀錄以 `figures` 對照核准來源；來源沒有的數值不畫，只寫定性描述。
- 無 JS 時顯示關鍵狀態與全部階段的 `<ol>`；尊重 `prefers-reduced-motion`；不自動播放；Pagefind 只收圖說。

另一條路是改用 MDX 直接在內文放元件，寫法最直覺，但要多一個整合、改變全部專題的檔案格式，內容檢查也得改讀 MDX。也考慮過照 anatomy 的 React 路線，但網站其他頁面都沒有框架，為一張圖引入執行期不划算。看到「改用 MDX」「加 React 元件」或「圖上補一個來源沒給的溫度」的提議時，先讀本篇；那屬於重新決定。

**Falsified if:** 互動圖需要的互動超出原生 JS 能合理維護的程度（例如多張圖共用複雜狀態），或站主決定互動圖可以取代插畫——屆時重新評估框架與嵌入方式。依賴的檔案：`src/markdown/topic-markdown.ts`、`src/vendor/anatomy/`、`src/figures/`、`src/content-checks/`。
