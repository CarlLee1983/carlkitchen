# 季節專題入口：實作驗證

日期：2026-10-08。工作目錄：`CarlKitchen-topics`；分支：`docs/topics-autumn-winter`。未提交、推送或部署。

## 變更

- 首頁：`src/components/HomeTopic.astro` 與 `src/pages/index.astro` 呈現精簡的本期專題，備選為 `content/topics/prep-basics/topic.md`。
- 檔期：`src/content/home-recommendation.ts` 定義每年及特定年度的日期格式；`src/content/topic-schema.ts` 接入可選的推薦與備選欄位；`src/utils/home-topics.ts` 負責台北日期選題及編輯設定驗證。
- 集合與檢查：`src/utils/topic-entries.ts` 在建置時拒絕錯誤推薦設定；`src/content-checks/topics.ts` 將相同問題納入內容檢查。
- 菜譜反向連結：`src/utils/related-topics.ts` 與 `src/pages/recipes/[id].astro`，沿用專題的 `relatedRecipes`，只列已發布文章，最多三篇。
- 單元測試：`tests/home-topics.test.ts`、`tests/related-topics.test.ts`、`tests/content-checks-topics.test.ts`。
- 瀏覽器測試：`e2e/home-topics.spec.ts`、`e2e/homepage.spec.ts`、`e2e/recipe-page.spec.ts`，及三份固定專題的推薦欄位。
- 文件：文化專題寫作分支、詞彙、README 操作方式、驗收清單、ADR 0006 與本批規格；原專題規格增加指向本次範圍擴充的連結。

## 驗證結果

- `pnpm check`：格式、Astro 型別與正式建置通過，0 errors。
- `pnpm test`：314 項通過。
- `E2E_PORT_BASE=4421 pnpm test:e2e`：167 項一般瀏覽器測試及 41 項配菜測試通過，共 208 項。
- 正式建置後 `pnpm check:content --launch`：通過，含候選池門檻。
- `pnpm exec wrangler deploy --dry-run`：通過，只驗證輸出，沒有真實部署。
- `topic-writing` 技能驗證與 `git diff --check`：通過。
- 獨立 reviewer 對實作與修正差異審閱：無重大問題。

最初完整瀏覽器測試有兩個測試斷言失敗：多個 template 的 strict locator，以及未納入新專題連結的鍵盤順序。修正後 29 項首頁測試通過，再跑完整測試也全部通過。

## 手機量測

正式內容、390×844，使用 `pnpm measure:mobile`：加入推薦前篩選列起點 354px、第一列菜譜起點 668px；加入後分別為 453px 與 767px。菜譜列中位高度維持 142px；第一道菜名仍在首屏，既有首屏測試沒有放寬。截圖位於 `/tmp/carlkitchen-topics-mobile.png`，已目視檢查。

## 剩餘事項

入口階段完成時，文章與兩道菜譜尚未製作。其後站主已核准五個網址並指定麻油雞在浸泡前加鹽；兩道菜譜的圖文與專題草稿已完成，詳見 [內容審閱紀錄](content-review.md)。補冬首頁檔期仍未啟用，兩道菜譜發布後再發布專題。

首頁日期依讀者裝置時間並轉為台北日曆日，腳本執行前可能短暫呈現常青備選；無 JavaScript 時只顯示備選，不承諾已開啟頁面在午夜立即換題。未開 PR 或推送，因此本輪未跑僅在該階段要求的 `check:merge`。
