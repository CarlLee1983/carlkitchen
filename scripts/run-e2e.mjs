// 依序跑三輪 Playwright（astro preview 同一專案一次只能起一個，三份站台不能同時 serve）：
// 預設站台、E2E_SITE=meal 的配菜站台，以及 E2E_SITE=show-more 的顯示更多站台。
// 前一輪失敗也會跑後面的輪次，最後合併結束碼，這樣任一輪的失敗都看得到其他輪的結果。
import { spawnSync } from "node:child_process";
import { findPortBase } from "./e2e-port.mjs";

// 沒指定 E2E_PORT_BASE 時自動挑三個連續 port 都空著的起點；有指定就照用。
// 三輪共用同一個 base（playwright.config.ts 依站台加 0／1／2）。
if (!process.env.E2E_PORT_BASE) {
  const base = await findPortBase();
  process.env.E2E_PORT_BASE = String(base);
  console.log(`e2e 使用 port ${base}–${base + 2}`);
}

const rounds = [{}, { E2E_SITE: "meal" }, { E2E_SITE: "show-more" }];
let failed = false;
for (const env of rounds) {
  const result = spawnSync("playwright", ["test", ...process.argv.slice(2)], {
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  if (result.status !== 0) failed = true;
}
process.exit(failed ? 1 : 0);
