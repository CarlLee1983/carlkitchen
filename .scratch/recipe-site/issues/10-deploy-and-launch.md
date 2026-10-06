# 10 — 部署與上線準備

Parent: [MVP 實作規格](../../recipe-mvp/issues/09-mvp-implementation-spec.md)

**What to build:** 站主合入主分支後，網站自動通過全部檢查並部署到 `carlkitchen.gravito.dev`；候選池未達門檻時部署停止並列出缺額。站主有一份回滾程序與上線驗收檢核表可照做。

**Blocked by:** 01, 08, 09

**Status:** ready-for-agent

- [ ] 部署工作流程在推送主分支或手動觸發時執行；沒有排程；並行部署不互相取消
- [ ] 部署前執行八項必要檢查與候選池門檻；未達門檻時停止並列出缺額，不影響合入
- [ ] 部署設定只服務自訂網域 `carlkitchen.gravito.dev`，關閉 workers.dev 與預覽網址
- [ ] 部署使用 01 建立的 secrets；設定檔與日誌不含 token
- [ ] README 記錄回滾程序：一般以 `git revert` 撤銷並自動重新部署；CI 故障時以 `wrangler rollback` 緊急退回，再修正主分支
- [ ] 建立上線驗收檢核表，涵蓋 08 驗收票的各項（多寬度、鍵盤、Lighthouse 手機模式效能 ≥ 90／LCP < 2.5 秒／首頁首次載入 < 500 KB、站主手機實測），供上線 PR 逐項勾選
