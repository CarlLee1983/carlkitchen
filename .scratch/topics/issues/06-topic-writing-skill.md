# 06: `topic-writing` skill 與專案守則

**What to build:** 代理收到選題參考後，能照 repo 內的 `topic-writing` skill 把它做成可送審的草稿專題：先請站主核准來源，再逐條查證、撰寫、去 AI 味、自查。外部文章不會被照抄，未經查證的口訣不會上線，站上也不會出現捏造的個人經驗。規格見[專題規格](../spec.md)。

**Blocked by:** 03, 05

**Status:** ready-for-agent

- [ ] repo 內新增 `topic-writing` skill；撰寫時依 `mattpocock-skills:writing-for-agents`
- [ ] 步驟依序如下：
  1. 確認選題參考與範圍：長篇依烹飪階段拆成多篇，完整料理示範交給 `recipe-making`
  2. 代理提出候選核准來源，站主核准
  3. 逐條查證並填段落對照，查不到依據的刪除或修正並回報
  4. 撰寫
  5. 跑 `de-ai-voice`
  6. 自查
  7. 維持草稿，送審 PR
- [ ] 規定每節結構（原則、原因、怎麼做與怎麼判斷、相關菜譜）與每篇約 1,500 到 3,000 字
- [ ] 規定不沿用選題參考的原句、不寫第一人稱；註明個人心得只能由站主撰寫
- [ ] 欄位與來源紀錄格式指向專題 schema 與 03 定下的來源紀錄，不在 skill 裡重抄
- [ ] 附自查清單
- [ ] `AGENTS.md` 的目錄結構與「寫作與內容」列出 `topic-writing` 與專題來源紀錄
