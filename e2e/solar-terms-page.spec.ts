import { expect, test, type Page } from "@playwright/test";
import data from "../src/data/solar-terms.json" with { type: "json" };
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

// 今年日期與目前節氣：由瀏覽器依讀者當下時間填入（ADR 0006、0007）。
const current = (page: Page) => page.locator("main [aria-current]");
const hanlu = (page: Page) => page.locator("#hanlu");

test("依讀者當下時間標出目前節氣，並填入今年的交節日期時刻與出處", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-10-10T12:00:00+08:00"));
  await page.goto("/solar-terms/");
  await expect(current(page)).toHaveCount(1);
  await expect(current(page)).toHaveAttribute("id", "hanlu");
  await expect(current(page)).toContainText("目前節氣");
  await expect(hanlu(page)).toContainText("10 月 8 日 14:29");
  await expect(hanlu(page)).toContainText("資料：中央氣象署");
  // 其他節氣也填了今年的日期，但不標為目前節氣。
  await expect(page.locator("#lichun")).toContainText("2 月 4 日");
  await expect(page.locator("#lichun")).not.toContainText("目前節氣");
  await expect(page.locator("main time:visible")).toHaveCount(24);
});

test("目前節氣於交節時刻（臺灣時間）切換", async ({ page }) => {
  for (const [date, id] of [
    ["2026-10-23T17:37:00+08:00", "hanlu"],
    ["2026-10-23T17:38:00+08:00", "shuangjiang"],
  ]) {
    await page.clock.setFixedTime(new Date(date!));
    await page.goto("/solar-terms/");
    await expect(current(page)).toHaveCount(1);
    await expect(current(page)).toHaveAttribute("id", id!);
  }
});

test("年初到小寒之前，目前節氣是去年的冬至，顯示它實際交節的日期", async ({
  page,
}) => {
  const dongzhi2026 = data.terms.find(
    (term) => term.name === "冬至" && term.date.startsWith("2026-"),
  )!;
  await page.clock.setFixedTime(new Date("2027-01-02T12:00:00+08:00"));
  await page.goto("/solar-terms/");
  await expect(current(page)).toHaveCount(1);
  await expect(current(page)).toHaveAttribute("id", "dongzhi");
  await expect(current(page)).toContainText("12 月 22 日");
  await expect(current(page).locator("time")).toHaveAttribute(
    "datetime",
    `${dongzhi2026.date}T${dongzhi2026.time}+08:00`,
  );
  // 其餘節氣照今年：小寒在今年 1 月。
  await expect(page.locator("#xiaohan")).toContainText("1 月");
});

test("公告用完的年份顯示「依天文推算」", async ({ page }) => {
  const afterOfficial = Number(data.terms.at(-1)!.date.slice(0, 4)) + 1;
  await page.clock.setFixedTime(
    new Date(`${afterOfficial}-10-10T12:00:00+08:00`),
  );
  await page.goto("/solar-terms/");
  await expect(current(page)).toHaveAttribute("id", "hanlu");
  await expect(hanlu(page)).toContainText("10 月");
  await expect(hanlu(page)).toContainText("依天文推算");
  await expect(page.getByRole("main")).not.toContainText("中央氣象署");
});

test("停用 JavaScript 時插畫與說明照常，且沒有日期與目前節氣標記", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/solar-terms/");
  await expect(hanlu(page)).toContainText("固定資料的寒露說明，只用於測試。");
  await expect(page.getByRole("img")).toHaveCount(24);
  // 當令食材連結不依賴 JavaScript。
  await expect(
    page.locator("#lichun").getByRole("link", { name: "番茄" }),
  ).toBeVisible();
  await expect(
    page
      .locator("#dongzhi")
      .getByRole("list", { name: "當令食材" })
      .getByRole("link"),
  ).toHaveText(["高麗菜", "蒜頭"]);
  await expect(page.locator("main time:visible")).toHaveCount(0);
  await expect(page.getByRole("main")).not.toContainText("目前節氣");
  await expect(page.getByRole("main")).not.toContainText("交節");
  await context.close();
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

// 當令食材：fixtures 中立春（番茄）與冬至（高麗菜、蒜頭）帶食材，其餘為空；
// 草稿食材條目不在任何節氣裡。
test("有當令食材的節氣顯示食材名稱並連到食材條目頁", async ({ page }) => {
  await page.goto("/solar-terms/");
  const dongzhi = page.locator("#dongzhi");
  await expect(
    dongzhi.getByRole("heading", { level: 4, name: "當令食材" }),
  ).toBeVisible();
  const links = dongzhi
    .getByRole("list", { name: "當令食材" })
    .getByRole("link");
  await expect(links).toHaveText(["高麗菜", "蒜頭"]);
  await expect(links.first()).toHaveAttribute("href", "/ingredients/cabbage/");
  await expect(
    page.locator("#lichun").getByRole("link", { name: "番茄" }),
  ).toHaveAttribute("href", "/ingredients/tomato/");

  await links.nth(1).click();
  await expect(page).toHaveURL(/\/ingredients\/garlic\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("蒜頭");
});

test("沒有當令食材的節氣不出現清單標題或空清單", async ({ page }) => {
  await page.goto("/solar-terms/");
  const withIngredients = ["lichun", "dongzhi"];
  for (const name of allTerms) {
    const id = solarTermArt[name as keyof typeof solarTermArt];
    if (withIngredients.includes(id)) continue;
    const block = page.locator(`#${id}`);
    await expect(block, `${name} 區塊`).toBeVisible();
    await expect(block.getByRole("heading", { level: 4 })).toHaveCount(0);
    await expect(block.getByRole("list")).toHaveCount(0);
    await expect(block).not.toContainText("當令食材");
  }
  await expect(page.getByRole("heading", { name: "當令食材" })).toHaveCount(2);
});

test("頁面附產期僅供參考的提醒", async ({ page }) => {
  await page.goto("/solar-terms/");
  await expect(
    page.getByRole("main").getByText("產期依地區與年度變動，僅供參考"),
  ).toBeVisible();
});
