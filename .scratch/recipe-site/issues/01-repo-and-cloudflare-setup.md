# 01 — 站主帳號設定：儲存庫、分支保護與 Cloudflare

Parent: [MVP 實作規格](../../recipe-mvp/issues/09-mvp-implementation-spec.md)

**What to build:** 讓網站有地方推送、跑 CI 與部署。這些操作需要站主本人的 GitHub 與 Cloudflare 帳號權限，代理無法代做；代理可提供指令與檢查步驟。

**Blocked by:** None — can start immediately（分支保護的「必要檢查」須等 02 的 CI 第一次在 PR 上執行後才能選取）

**Status:** done

- [x] 建立 GitHub 儲存庫 `CarlLee1983/carlkitchen`（公開；私有儲存庫在站主帳號下無法使用分支保護），推送 `main` 與 `prototype/06-homepage-direction`
- [x] 主分支開啟分支保護（含管理員）：必經 PR、不要求核准數、禁止強制推送與刪除；只有站主有寫入權
- [x] 02 的 CI job `verify` 已設為主分支的必要檢查（不要求分支與主分支同步）；之後新增的 CI job 同樣加入
- [x] Cloudflare 上 `gravito.dev` 為 Active，`carlkitchen` 尚無 DNS 記錄，可由部署時建立自訂網域 `carlkitchen.gravito.dev`
- [x] 以 `cf` CLI 建立使用者 API token `carlkitchen-deploy`：帳號層級 Workers Scripts Write、Account Settings Read；`gravito.dev` 區域 Workers Routes Write、Zone Read。值直接寫入 secret `CLOUDFLARE_API_TOKEN`，帳號 ID 存為 `CLOUDFLARE_ACCOUNT_ID`；token 未出現在檔案或對話中。權限是否足夠由 10 的第一次實際部署驗證
