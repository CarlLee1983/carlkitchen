// 依序跑兩輪 Playwright（astro preview 同一專案一次只能起一個，兩份站台不能同時 serve）：
// 預設站台，以及 E2E_SITE=meal 的配菜站台。第一輪失敗也會跑第二輪，最後合併結束碼，
// 這樣任一輪的失敗都看得到另一輪的結果。
import { spawnSync } from "node:child_process";

const rounds = [{}, { E2E_SITE: "meal" }];
let failed = false;
for (const env of rounds) {
  const result = spawnSync("playwright", ["test", ...process.argv.slice(2)], {
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  if (result.status !== 0) failed = true;
}
process.exit(failed ? 1 : 0);
