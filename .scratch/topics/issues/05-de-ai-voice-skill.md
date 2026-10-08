# 05: `de-ai-voice` skill

**What to build:** 代理寫完專題、菜譜或食材條目的文字後，送審前先跑 repo 內的去 AI 味步驟。站主收到的稿子不必逐句改腔調，Codex 等其他代理也讀得到這套規則。規格見[專題規格](../spec.md)。

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] repo 內新增 `de-ai-voice` skill，以全域 `humanize-writing` 的繁中規則為底，精簡成站點版本；撰寫時依 `mattpocock-skills:writing-for-agents`
- [ ] 規定只改腔調，保留事實、立場與臺灣用語
- [ ] 列出站點限制：不宣稱試作、不寫療效、不用促銷語氣、不捏造第一人稱經驗、不寫空泛的總結句、不硬套清單體
- [ ] `recipe-writing` 與 `ingredient-writing` 在送審前加一步呼叫 `de-ai-voice`；不回頭重寫已發布內容
- [ ] `AGENTS.md`「寫作與內容」列出 `de-ai-voice`
- [ ] 用一段既有菜譜文字試跑一次，修改前後的對照附在 PR 說明，供站主審閱
