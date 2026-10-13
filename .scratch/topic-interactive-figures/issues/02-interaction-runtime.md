# 02: 互動執行期

**What to build:** 讀者在含互動圖的專題頁可以拖時間滑桿、按播放／暫停、切換帶膜／去膜、點階段清單跳到該階段，讀數即時更新並由螢幕閱讀器播報；鍵盤可完整操作，設定減少動態時不跑補間動畫。依據：規格 `.scratch/topic-interactive-figures/spec.md`、ADR 0011。

**Blocked by:** 01（`figure` 區塊產出靜態互動圖）

**Status:** ready-for-agent

- [ ] 原生 JS，只在含互動圖的頁面載入；沒有互動圖的專題頁不載入互動圖的 JS 與 CSS
- [ ] 時間滑桿更新 SVG 狀態與讀數；「7 到 12 分鐘」在時間軸上呈現為區間帶
- [ ] 播放鈕約 6 秒走完全程、到底自動停，播放中可暫停或拖滑桿接手；進入畫面不自動播放
- [ ] 帶膜／去膜切換改變花生外觀與讀數
- [ ] 點階段 `<ol>` 的項目跳到該階段
- [ ] 讀數區 `aria-live="polite"`；滑桿、播放鈕、切換、階段清單皆可用鍵盤操作
- [ ] `prefers-reduced-motion: reduce` 時無補間動畫，播放改為逐階段跳轉
- [ ] JS 載入前不出現無作用的控制項；停用 JS 時仍看到關鍵狀態與清單
- [ ] e2e 驗證以上各項（固定專題 `knife-skills`）
- [ ] `pnpm check && pnpm test && pnpm test:e2e` 全綠
