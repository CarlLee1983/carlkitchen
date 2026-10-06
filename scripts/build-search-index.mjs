// 建置後以 Pagefind 為已發布菜譜頁建立搜尋索引。
// 只收 recipes/ 底下的頁面：正式內容為空時，Pagefind 預設會改為索引全站，
// 但沒有任何菜譜頁時 `--glob` 又會讓它因「沒有 HTML」而失敗，所以沒有菜譜頁就略過。
import { execFileSync } from "node:child_process";
import { existsSync, globSync } from "node:fs";

const SITE = "dist";
const GLOB = "recipes/**/*.html";

if (!existsSync(SITE)) {
  console.error(`找不到 ${SITE}，請先執行 astro build。`);
  process.exit(1);
}

if (globSync(GLOB, { cwd: SITE }).length === 0) {
  console.log("沒有菜譜頁，略過 Pagefind 索引。");
} else {
  // 沿用 pnpm 腳本環境的 PATH 找到 pagefind；失敗時直接讓建置失敗。
  execFileSync("pagefind", ["--site", SITE, "--glob", GLOB], {
    stdio: "inherit",
  });
}
