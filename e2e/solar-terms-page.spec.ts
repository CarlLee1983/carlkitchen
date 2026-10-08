import { expect, test } from "@playwright/test";
import { solarTermArt } from "../src/utils/solar-terms";

// axe 與各寬度無水平捲動由 a11y.spec.ts 的頁面清單涵蓋。
// 測試用固定節氣（tests/fixtures/solar-terms）：24 筆齊全，說明為「固定資料的<節氣>說明，只用於測試。」。
const seasons = [
  { title: "春季", terms: ["立春", "雨水", "驚蟄", "春分", "清明", "穀雨"] },
  { title: "夏季", terms: ["立夏", "小滿", "芒種", "夏至", "小暑", "大暑"] },
  { title: "秋季", terms: ["立秋", "處暑", "白露", "秋分", "寒露", "霜降"] },
  { title: "冬季", terms: ["立冬", "小雪", "大雪", "冬至", "小寒", "大寒"] },
];
const allTerms = seasons.flatMap(({ terms }) => terms);

test("總覽頁依春夏秋冬分四組，各有標題，節氣從立春排到大寒", async ({
  page,
}) => {
  await page.goto("/solar-terms/");
  const main = page.getByRole("main");
  await expect(
    main.getByRole("heading", { level: 1, name: "二十四節氣" }),
  ).toBeVisible();
  await expect(main.getByRole("heading", { level: 2 })).toHaveText(
    seasons.map(({ title }) => title),
  );
  for (const { title, terms } of seasons) {
    const group = main.getByRole("region", { name: title });
    await expect(group.getByRole("heading", { level: 3 })).toHaveText(terms);
  }
});

test("每個節氣一個以識別值為 id 的區塊，附插畫、替代文字與說明", async ({
  page,
}) => {
  await page.goto("/solar-terms/");
  for (const name of allTerms) {
    const id = solarTermArt[name as keyof typeof solarTermArt];
    const block = page.locator(`#${id}`);
    await expect(block, `${name} 區塊`).toHaveCount(1);
    await expect(block.getByRole("heading", { level: 3 })).toHaveText(name);
    await expect(
      block.getByRole("img", { name: `${name}節氣插畫` }),
    ).toHaveCount(1);
    await expect(block).toContainText(`固定資料的${name}說明，只用於測試。`);
  }
  await expect(page.getByRole("img")).toHaveCount(24);
});

test("網址帶錨點時捲到該節氣", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/solar-terms/#dongzhi");
  await expect(page.locator("#dongzhi")).toBeInViewport();
});

test("首頁節氣列連到總覽頁上該節氣的位置", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-10T12:00:00+08:00"));
  await page.goto("/");
  const link = page
    .getByRole("region", { name: "這個時節" })
    .getByRole("link", { name: /寒露/ });
  await expect(link).toHaveAttribute("href", "/solar-terms/#hanlu");
  await link.click();
  await expect(page).toHaveURL(/\/solar-terms\/#hanlu$/);
  await expect(page.locator("#hanlu")).toBeInViewport();
});

test("站內搜尋索引收錄總覽頁，搜尋節氣名找得到", async ({ page }) => {
  await page.goto("/");
  const urls = await page.evaluate(async () => {
    const moduleUrl = "/pagefind/pagefind.js";
    const pagefind = await import(/* @vite-ignore */ moduleUrl);
    const response = await pagefind.search("冬至");
    const pages = await Promise.all(
      response.results.map((result: { data: () => Promise<{ url: string }> }) =>
        result.data(),
      ),
    );
    return pages.map((item) => item.url);
  });
  expect(urls.map((url) => new URL(url, "http://x").pathname)).toContain(
    "/solar-terms/",
  );
});
