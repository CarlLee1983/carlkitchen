---
status: accepted
---

# 保留首頁隨機大圖與 Cloudflare Web Analytics，接受 PageSpeed 剩下的項目

2026-10-08 依 PageSpeed 行動版調校（PR #69、#71、#72）後，效能 99–100，剩下的深入分析項目刻意不處理，站主同意保留：

- **LCP 要求探索**（LCP 圖片不在初始 HTML）：首頁大圖每次開啟由內嵌腳本從 `<template>` 隨機挑一張，瀏覽器解析到才知道要載哪張。要通過就得在建置時或邊緣固定挑圖，讓同一段期間所有人看到同一道菜，失去「隨機看看一道菜」的用意。實測圖片載入延遲約 90 ms，已帶 `fetchpriority=high`、不造成版面位移，換來的分數不值得。
- **舊版 JavaScript、快取生命週期、第三方、網路依附鏈**：都來自 Cloudflare 在邊緣注入的 Web Analytics `beacon.min.js`（約 10 KiB），網站程式無法改它的內容或快取標頭，唯一解法是在 Cloudflare 後台關閉 Web Analytics，代價是失去流量統計。

看到「把首頁大圖改成固定」或「為了 PageSpeed 拿掉 beacon」的提議時，先讀本篇；那屬於重新決定，不是修效能問題。

**Falsified if:** 首頁大圖不再隨機（`src/pages/index.astro` 的 `HERO_PICK_SCRIPT` 被移除或改成固定挑圖），或 PageSpeed 的 LCP 細目中「資源載入延遲」超過 500 ms，或站主不再使用 Cloudflare 流量統計。依賴的檔案：`src/pages/index.astro`（隨機大圖腳本）。
