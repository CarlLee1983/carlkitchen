// 量測首頁手機版版面：篩選列與第一列的位置、每列高度、一屏列數、摘要行數。
// 先 `pnpm build`（正式內容），本腳本自己起 preview、量完即關。
// 用法：pnpm measure:mobile [--width 390] [--height 844] [--shot 截圖.png] [--port 4621]
import { spawn } from "node:child_process";
import { parseArgs } from "node:util";
import { chromium } from "@playwright/test";

const { values } = parseArgs({
  options: {
    width: { type: "string", default: "390" },
    height: { type: "string", default: "844" },
    shot: { type: "string" },
    port: { type: "string", default: "4621" },
  },
});
const width = Number(values.width);
const height = Number(values.height);
const url = `http://localhost:${values.port}/`;

const preview = spawn(
  "pnpm",
  ["exec", "astro", "preview", "--port", values.port],
  {
    env: { ...process.env, ASTRO_PREVIEW_BACKGROUND: "1" },
    stdio: "ignore",
    // 自成一個行程群組，結束時連 pnpm 底下的 astro 一起收掉，不留孤兒 preview。
    detached: true,
  },
);

async function waitForServer() {
  for (let i = 0; i < 50; i += 1) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // 還沒起來，稍後重試
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(
    `preview 未在 10 秒內於 ${url} 回應（port 被占用？改 --port）`,
  );
}

try {
  await waitForServer();
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 3,
  });
  await page.goto(url, { waitUntil: "networkidle" });
  const result = await page.evaluate((screen) => {
    const top = (el: Element | null): number =>
      el ? Math.round(el.getBoundingClientRect().top + scrollY) : 0;
    const rows = [...document.querySelectorAll("[data-recipe-row]")];
    const heights = rows
      .map((row) => row.getBoundingClientRect().height)
      .sort((a, b) => a - b);
    const firstRow = top(rows[0] ?? null);
    const lines: Record<number, number> = {};
    for (const row of rows) {
      const summary = row.querySelector("p");
      if (!summary) continue;
      const style = getComputedStyle(summary);
      const lineHeight =
        parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2;
      const count = Math.round(
        summary.getBoundingClientRect().height / lineHeight,
      );
      lines[count] = (lines[count] ?? 0) + 1;
    }
    return {
      filterBarTop: top(document.querySelector('[role="group"]')),
      firstRowTop: firstRow,
      rows: rows.length,
      rowHeight: {
        min: Math.round(heights[0] ?? 0),
        median: Math.round(heights[Math.floor(heights.length / 2)] ?? 0),
        max: Math.round(heights.at(-1) ?? 0),
      },
      rowsPerScreen: rows.filter(
        (row) =>
          top(row) + row.getBoundingClientRect().height <= firstRow + screen,
      ).length,
      summaryLines: lines,
      documentHeight: document.documentElement.scrollHeight,
    };
  }, height);
  console.log(
    JSON.stringify({ viewport: `${width}x${height}`, ...result }, null, 2),
  );
  if (values.shot) await page.screenshot({ path: values.shot });
  await browser.close();
} finally {
  if (preview.pid) process.kill(-preview.pid);
}
