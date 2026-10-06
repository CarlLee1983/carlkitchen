# 01 — 站主帳號設定：儲存庫、分支保護與 Cloudflare

Parent: [MVP 實作規格](../../recipe-mvp/issues/09-mvp-implementation-spec.md)

**What to build:** 讓網站有地方推送、跑 CI 與部署。這些操作需要站主本人的 GitHub 與 Cloudflare 帳號權限，代理無法代做；代理可提供指令與檢查步驟。

**Blocked by:** None — can start immediately（分支保護的「必要檢查」須等 02 的 CI 第一次在 PR 上執行後才能選取）

**Status:** ready-for-human

- [x] 建立 GitHub 儲存庫 `CarlLee1983/carlkitchen`（公開；私有儲存庫在站主帳號下無法使用分支保護），推送 `main` 與 `prototype/06-homepage-direction`
- [x] 主分支開啟分支保護（含管理員）：必經 PR、不要求核准數、禁止強制推送與刪除；只有站主有寫入權
- [ ] 02 的 CI 在 PR 上跑過一次後，把它的檢查設為必要檢查；之後每張票新增的檢查同樣加入
- [ ] Cloudflare 上 `gravito.dev` 可為 Worker 綁定自訂網域 `carlkitchen.gravito.dev`
- [ ] 建立僅限部署本站的 Cloudflare API token，與帳號 ID 一起存成儲存庫 secrets；token 不出現在任何檔案或對話中
