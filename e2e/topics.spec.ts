import { expect, test } from "@playwright/test";
import {
  expectNoAxeViolations,
  expectNoHorizontalScroll,
} from "./a11y-helpers";

// 測試用固定專題（tests/fixtures/topics）：三篇已發布，日期 2026-09-01、08-15、07-01，
// 另有一篇日期最新的草稿。
const publishedNewestFirst = ["夏天的涼拌菜", "煮飯的基本功", "刀工入門"];

test("專題列表只列已發布專題，依發布日期由新到舊，卡片有標題、短介與日期", async ({
  page,
}) => {
  await page.goto("/topics/");
  await expect(
    page.getByRole("heading", { level: 1, name: "專題" }),
  ).toBeVisible();
  const cards = page.getByRole("main").getByRole("listitem");
  await expect(cards).toHaveCount(publishedNewestFirst.length);
  for (const [index, title] of publishedNewestFirst.entries()) {
    await expect(cards.nth(index).getByRole("link")).toHaveText(title);
  }
  const first = cards.first();
  await expect(first).toContainText("三種十分鐘內完成的涼拌做法。");
  await expect(first.locator("time")).toHaveAttribute("datetime", "2026-09-01");
  await expect(first.locator("time")).toHaveText("2026 年 9 月 1 日");
  await expect(page.getByText("尚未發布的草稿專題")).toHaveCount(0);
});

test("專題文章頁顯示標題、發布日期與內文，小節標題層級正確", async ({
  page,
}) => {
  await page.goto("/topics/summer-salads/");
  await expect(
    page.getByRole("heading", { level: 1, name: "夏天的涼拌菜" }),
  ).toBeVisible();
  await expect(page.locator("main time")).toHaveAttribute(
    "datetime",
    "2026-09-01",
  );
  await expect(page.getByRole("main")).toContainText("不開火也能上桌");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(
    page.getByRole("heading", { level: 2, name: "涼拌小黃瓜" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 3, name: "調味比例" }),
  ).toBeVisible();
});

test("從導覽列的「專題」進入列表，再點進文章", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "主選單" });
  const links = await nav.getByRole("link").allTextContents();
  expect(links.indexOf("專題")).toBe(links.indexOf("食材介紹") + 1);
  await nav.getByRole("link", { name: "專題" }).click();
  await expect(page).toHaveURL(/\/topics\/$/);
  await page.getByRole("link", { name: "煮飯的基本功" }).click();
  await expect(page).toHaveURL(/\/topics\/rice-basics\/$/);
});

test("草稿專題網址在正式建置回 404", async ({ page }) => {
  const response = await page.goto("/topics/draft-topic/");
  expect(response?.status()).toBe(404);
});

test("專題頁在手機寬度沒有水平捲動", async ({ page }) => {
  await expectNoHorizontalScroll(page, "/topics/");
  await expectNoHorizontalScroll(page, "/topics/summer-salads/");
});

for (const [name, path] of [
  ["專題列表頁", "/topics/"],
  ["專題文章頁", "/topics/summer-salads/"],
] as const) {
  test(`${name}零 axe 違規`, async ({ page }) => {
    await page.goto(path);
    await expectNoAxeViolations(page, name);
  });
}
