# Anatomy kit（手動同步）

上游：[wheresryan22/anatomy](https://github.com/wheresryan22/anatomy)，固定於 commit [`689dcf966e63d92be10a5d593c6e19e10acd4422`](https://github.com/wheresryan22/anatomy/commit/689dcf966e63d92be10a5d593c6e19e10acd4422)。授權見同目錄 `LICENSE`（MIT）。

只複製 `kit/iso-kit.ts`（等角相機、實體、SVG 字串渲染核心）及 `kit/iso.css`。未修改上游幾何或 CSS；TypeScript 檔第一行加了 `@ts-nocheck`，因本站更嚴格的陣列索引檢查會報上游現有程式的型別錯誤。站點風格另以 CSS 變數覆寫。更新時選定新 commit，逐檔與上游比較後複製、保留型別指令、跑專題渲染及瀏覽器測試，再更新此處 commit。沒有自動同步機制。
