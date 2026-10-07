# 05: 新增菜譜必填 `timeMinutes` 並補齊舊資料

**What to build:** 每道菜譜都有烹調時間，為之後的時間篩選鋪路（[01-browsing-spec](01-browsing-spec.md)〈Out of Scope〉）。schema 把 `timeMinutes` 改為必填；目前缺少時間的 18 道已發布菜譜依核准來源補上，來源沒有寫明時依步驟推估，並在 PR 中逐道註明依據。

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

**站主決定（2026-10-07）：** `timeMinutes` 是從開始備料到上桌的總時間，含醃漬、泡發、燉煮等等待時間。核准來源寫有時間時以來源為準；來源沒寫時依步驟推估，並在 PR 中逐道註明依據。

- [ ] schema 中 `timeMinutes` 為必填
- [ ] 所有菜譜都有 `timeMinutes`；PR 逐道列出來源或推估依據
- [ ] `tests/recipe-schema.test.ts` 涵蓋缺少 `timeMinutes` 時建置失敗
- [ ] `recipe-making`、`recipe-writing` skill 說明時間欄位的寫法
- [ ] `pnpm check && pnpm test && pnpm test:e2e` 全部通過
