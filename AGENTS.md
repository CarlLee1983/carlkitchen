# 專案守則

CarlKitchen：依公開資料整理、站主審閱的繁體中文菜譜網站。Astro 靜態輸出，部署在 Cloudflare Workers Static Assets（`carlkitchen.gravito.dev`）。

## 目錄結構

- `src/` — 網站程式：`content.config.ts`（內容集合）、`content/recipe-schema.ts`（菜譜 schema）、`pages/`、`layouts/`、`utils/`
- `content/recipes/<菜譜識別值>/` — 正式菜譜：`recipe.yaml` 與同資料夾的 WebP 圖片（YAML 以相對路徑引用）。資料夾名稱即識別值與網址 `/recipes/<識別值>/`；識別值只能是小寫英數字以連字號分隔（`^[a-z0-9]+(?:-[a-z0-9]+)*$`，例如 `tomato-egg`），內容檢查會擋下其他格式
- `content/sources/<菜譜識別值>.yaml` — 內部來源紀錄：`urls` 列出至少一個核准來源網址。位於內容集合載入範圍（`content/recipes`）與 `public/` 之外，不被任何頁面或建置流程讀取，只由內容檢查指令讀取
- `content/topics/<專題識別值>/topic.md` — 專題：Markdown 加 frontmatter（`title`、`summary`、`draft`、`publishedAt`、`hero`、`relatedRecipes`、`relatedIngredients`、`references`），封面圖放同資料夾。資料夾名稱即識別值與網址 `/topics/<識別值>/`，格式規則同菜譜；目前尚無正式專題，目錄以 `.gitkeep` 保留
- `content/topic-sources/<專題識別值>.yaml` — 專題內部來源紀錄：`sources`（`title`、`url`）與段落對照 `sections`（`heading` 為內文 `##`／`###` 標題純文字，`urls` 須列在 `sources`）。位置與角色同 `content/sources/`，不進內容集合與公開輸出；選題參考放專題 frontmatter，不是核准來源
- `content/solar-terms/<節氣識別值>.yaml` — 節氣總覽（`/solar-terms/`）的資料：每個節氣一個檔，固定 24 個識別值，與 `src/assets/solar-terms/` 的插畫檔名相同（`lichun`、`lidong` 等）。欄位 `name`、`description`（一兩句）、`seasonalIngredients`（當令食材條目識別值，可為空陣列）；沒有 `draft`，所屬季節由識別值決定（`src/utils/solar-terms.ts` 的 `solarTermSeasons`）。目錄沒有任何資料時不產生 `/solar-terms/`、首頁節氣列不加連結；有資料就必須 24 筆齊全，否則建置失敗。目前尚無正式節氣資料，目錄以 `.gitkeep` 保留
- `content/solar-term-sources/` — 節氣說明的內部來源紀錄目錄，位置與角色同 `content/topic-sources/`（不進內容集合與公開輸出）；目前只保留目錄，內容檢查尚未讀取
- `src/data/solar-terms.json` — 首頁「這個時節」的二十四節氣交節時刻（中央氣象署開放資料 A-A0087-003，臺灣時間），插畫在 `src/assets/solar-terms/`。公告資料目前到 2027-12-22 冬至；之後由 `src/utils/solar-term-calc.ts` 在建置時依太陽視黃經推算，補到建置年後 5 年，頁面標示「依天文推算」。氣象署公告新年度後補進 JSON，推算值即被取代；單元測試會比對推算與公告，日期須相同、時刻差不超過 2 分鐘
- `tests/` — 單元測試（Node 內建測試執行器）；`tests/fixtures/recipes/` 為測試用固定菜譜，含一份草稿
- `e2e/` — Playwright 瀏覽器測試
- `.scratch/` — 規格與票；`.claude/skills/` — 菜譜製作（`recipe-making`）、菜譜寫作（`recipe-writing`）、食材寫作（`ingredient-writing`）、專題寫作（`topic-writing`）與去 AI 味（`de-ai-voice`）skill

## 指令

套件管理用 pnpm。

- `pnpm dev` — 開發伺服器（顯示草稿）
- `pnpm build` / `pnpm preview` — 正式建置（排除草稿，建置後以 Pagefind 建立含菜譜頁與專題頁的搜尋索引）與預覽。建置固定帶 `--force`，在 `RECIPES_DIR` 切換時清除 Astro 內容層快取，不可拿掉
- `pnpm check` — 格式檢查、`astro check`、建置
- `pnpm check:content` — 內容與建置輸出檢查（來源紀錄、洩漏、圖片規格、成品圖替代文字不得提到餐具、頁面文案不得提 AI 或試做；含專題：已發布專題的來源紀錄與段落對照、封面圖規格、相關連結只指向已發布頁面、草稿與核准來源網址不得出現在輸出）；需先 `pnpm build`，輸出目錄預設 `dist`（`--dist <目錄>` 可改）。加 `--launch` 另檢查候選池門檻（非湯配菜候選 ≥ 12、湯 ≥ 3），供部署前使用，PR 不開。節氣：當令食材只能指向已發布食材條目（空目錄通過）。`SOURCES_DIR` 可改來源紀錄目錄，`TOPIC_SOURCES_DIR` 可改專題來源紀錄目錄，`SOLAR_TERMS_DIR` 可改節氣目錄（預設 `content/solar-terms`）
- `pnpm test` — 單元測試
- `pnpm test:e2e` — 以固定菜譜建置後跑 Playwright（chromium）；建置輸出在 `dist`、port 以 `E2E_PORT_BASE`（預設 4321）起算，平行跑需各用一個 worktree 並錯開 port
- `pnpm check:merge` — 在暫時 worktree 合併 `origin/main` 後跑 CI 的檢查（加 `--e2e` 含瀏覽器測試），抓分支本身全綠、合併後才壞的情況
- `pnpm measure:mobile` — 量測首頁手機版版面（篩選列與第一列位置、列高、一屏列數）；需先 `pnpm build`。談版面數字先量再估
- `pnpm format` — 格式化

環境變數 `RECIPES_DIR` 選擇內容根目錄，預設 `content/recipes`；測試與 e2e 用 `tests/fixtures/recipes`。環境變數 `TOPICS_DIR` 選擇專題根目錄，預設 `content/topics`；e2e 用 `tests/fixtures/topics`（含一份草稿），專題來源紀錄 `TOPIC_SOURCES_DIR` 預設 `content/topic-sources`、測試用 `tests/fixtures/topic-sources`。環境變數 `SOLAR_TERMS_DIR` 選擇節氣根目錄，預設 `content/solar-terms`；e2e 用 `tests/fixtures/solar-terms`（24 筆齊全），配菜站台用空的 `tests/fixtures/solar-terms-empty` 驗證空集合規則；節氣來源紀錄 `SOLAR_TERM_SOURCES_DIR` 預設 `content/solar-term-sources`（保留給之後的內容檢查，目前沒有程式讀取）。

## 部署

- `.github/workflows/ci.yml`（PR）與 `deploy.yml`（推送 `main`／手動，手動也只部署 `main`，無排程，並行排隊不取消）共用 `.github/actions/verify`，改檢查步驟只改這一處。
- 部署在共用檢查後以正式內容重建，再跑 `pnpm check:content --launch`（非湯料理 ≥ 12、湯 ≥ 3）才 `wrangler deploy`；不得為了讓部署通過而放寬門檻。
- 回滾程序見 `README.md`「部署與回滾」；上線驗收檢核表見 `docs/acceptance.md`。
- 不得執行真實部署或 `wrangler rollback`，也不得把 token 寫進檔案或日誌。

## 寫作與內容

新增、修改菜譜或重製插畫依 `recipe-making` skill（`.claude/skills/recipe-making/`，含來源核准、Codex 生圖與轉檔腳本、送審清單）；菜譜文字依 `recipe-writing` skill（`.claude/skills/recipe-writing/`）。新增、修改食材條目文字依 `ingredient-writing` skill（`.claude/skills/ingredient-writing/`）。新增、修改專題依 `topic-writing` skill（`.claude/skills/topic-writing/`）：先請站主核准來源，再逐條查證，專題內文在 `content/topics/<識別值>/topic.md`，內部來源紀錄在 `content/topic-sources/<識別值>.yaml`；個人心得只由站主撰寫，食材、調味料、廚具與烹調動作一律用臺灣用詞。菜譜、食材條目與專題的文字送審前依 `de-ai-voice` skill（`.claude/skills/de-ai-voice/`）去 AI 味，只改腔調，不動事實與用量。菜譜 schema 見 `src/content/recipe-schema.ts`：每張圖都是 `{ src, alt }`，alt 必填；已發布菜譜須有成品圖（`hero`）、材料合照（`ingredientsPhoto`）與至少一張步驟圖。

圖片規格慣例：WebP、1536×1024、不超過 300 KB。schema 不檢查這些，由 `pnpm check:content` 強制（門檻第 4 項）。成品圖不畫餐具（`.scratch/recipe-mvp/issues/06-homepage-direction.md`〈圖片風格規格〉），`pnpm check:content` 以替代文字是否提到餐具把關。

## 程式與測試

註解與文件用繁體中文，程式識別字用英文。先寫失敗的測試再實作；修 bug 附回歸測試。提交前跑 `pnpm check && pnpm test && pnpm test:e2e`；開 PR 或推送更新前再跑 `pnpm check:merge`。審查依 `CODING_STANDARDS.md`。

## 代理權限

- 草稿留在本地工作分支。
- 準備好請站主審閱時，才推送工作分支並開 PR。
- 不得推送 `main`，不得合入任何 PR（包含 `gh pr merge`）。合入由站主完成，等同發布核准。
