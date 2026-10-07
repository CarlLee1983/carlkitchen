// 建置後以 Pagefind 為已發布菜譜頁與專題頁建立搜尋索引。
// 只收 recipes/、topics/ 底下的頁面：正式內容為空時，Pagefind 預設會改為索引全站，
// 但沒有任何這類頁面時 `--glob` 又會讓它因「沒有 HTML」而失敗，所以沒有就略過。
// 兩類頁面都以 data-pagefind-body 標記可搜尋範圍，專題列表頁沒有標記所以不進索引。
import { execFileSync } from "node:child_process";
import { existsSync, globSync } from "node:fs";

const SITE = process.env.ASTRO_OUT_DIR || "dist";
const GLOBS = ["recipes/**/*.html", "topics/**/*.html"];

if (!existsSync(SITE)) {
  console.error(`找不到 ${SITE}，請先執行 astro build。`);
  process.exit(1);
}

if (GLOBS.every((glob) => globSync(glob, { cwd: SITE }).length === 0)) {
  console.log("沒有菜譜頁或專題頁，略過 Pagefind 索引。");
} else {
  // 沿用 pnpm 腳本環境的 PATH 找到 pagefind；失敗時直接讓建置失敗。
  execFileSync("pagefind", ["--site", SITE, "--glob", `{${GLOBS.join(",")}}`], {
    stdio: "inherit",
  });
}
