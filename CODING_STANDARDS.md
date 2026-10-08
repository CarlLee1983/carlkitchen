# 程式標準

審查時逐條套用。機械性的規則交給 `pnpm check`（Prettier、`astro check`），這裡只放工具抓不到、需要判斷的規則。

## 分類分支窮舉

依菜譜分類（`RecipeCategory`）分支時，用 `switch` 逐一列出每個分類，`default` 以 `satisfies never` 收尾。這樣新增分類時，每個分支點都會在 `astro check` 報錯。`else`、`!== "某分類"` 這類寫法會把新分類默默歸到某一邊，審查時要改成窮舉。

## 版面測試斷言量到的結果

e2e 的版面測試斷言使用者看得到的結果：元素位置、尺寸、寬高比、可見行數、捲動後的位置。CSS 屬性值、class 名稱、DOM 結構都是實作細節，換一種寫法達到同樣版面時測試仍應通過。用來定位元素的選擇器不受此限。

## 圖片與首頁效能

PageSpeed 行動版調校後的設定，改動時照下列規則，避免默默退回。

- **`sizes` 照實際顯示寬度寫**：新增或改動插畫的版面時，`sizes` 要等於圖在各斷點的實際寬度，不能寫 `100vw` 了事——`main` 左右各有 1.5rem 留白，手機預設值是 `calc(100vw - 3rem)`，有縮排的區塊再扣。寬度先用 Playwright 量再寫；寫小了圖會糊，`e2e/image-sizes.spec.ts` 掃各頁各寬度會擋；寫大了只是多下載，只有首頁與菜譜頁在代表寬度有 ±1px 斷言，其餘靠審查。斷點用 media query 寫，不在 `sizes` 裡用 `min()`，維持最廣的瀏覽器相容性。
- **CSS 內嵌與 WebP 品質是刻意設定**：`astro.config.mjs` 的 `inlineStylesheets: "always"`（去掉阻擋繪製的 CSS 請求）與 WebP `quality: 70` 不要拿掉或調回預設。調品質要先局部放大比對；本機驗證前清 `node_modules/.astro/assets`，Astro 圖片快取不認編碼設定。
- **首頁列的預估高度跟著版面改**：`.row` 用 `content-visibility: auto`，`contain-intrinsic-size` 只算內容區（列高扣上下 padding 與框線）。改了列的 padding、縮圖尺寸或摘要行數，用 `pnpm measure:mobile` 與寬版實測列高重算，確認捲完全頁前後文件高度不變。
- **PageSpeed 剩下的項目先讀 ADR**：「LCP 要求探索」與 Cloudflare Web Analytics 帶來的幾項是刻意保留，見 [ADR 0005](docs/adr/0005-keep-random-hero-and-web-analytics.md)。
