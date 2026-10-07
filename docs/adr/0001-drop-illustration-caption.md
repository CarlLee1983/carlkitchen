---
status: superseded
---

> 已由 [ADR 0004](0004-reference-only-copy.md) 取代：網站不再揭露 AI 製作，下文的揭露前提不再成立；不加逐圖圖說的結論維持不變。

# 料理插畫不加「AI 繪製插畫」圖說

MVP 原本規定每張料理圖旁標示「AI 繪製插畫」（[MVP 驗收票](../../.scratch/recipe-mvp/issues/08-mvp-acceptance.md)、[實作規格](../../.scratch/recipe-mvp/issues/09-mvp-implementation-spec.md) 第 29 條）。站主於 2026-10-07 決定移除逐圖圖說（PR #13）。AI 製作的揭露改由兩處承擔：每份菜譜頁底的「依公開資料由 AI 整理、站主審閱，未經試做」，以及關於頁「AI 整理與繪製插畫」一節說明全站料理圖都是 AI 繪製的插畫。

舊規格與票中「每張圖標示」的敘述已被本決定取代；看到它們時，以本 ADR 為準，不要把圖說加回去。

**Falsified if:** 頁底聲明或關於頁的 AI 插畫說明被移除，使網站上再也沒有任何地方揭露料理圖是 AI 繪製——此時揭露不足，需要重新決定是否恢復逐圖圖說。依賴的檔案：`src/components/Illustration.astro`（不輸出圖說）、`src/pages/about.astro`（AI 插畫說明）、`src/pages/recipes/[id].astro`（頁底聲明）、`e2e/recipe-page.spec.ts`（斷言圖說不存在）。
