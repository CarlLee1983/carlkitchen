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

test("列表卡片顯示封面圖與替代文字", async ({ page }) => {
  await page.goto("/topics/");
  const cards = page.getByRole("main").getByRole("listitem");
  for (let index = 0; index < publishedNewestFirst.length; index += 1) {
    const image = cards.nth(index).getByRole("img");
    await expect(image).toHaveAttribute("alt", "固定資料專題的測試封面");
    await expect(image).toBeVisible();
  }
});

test("文章頁依序顯示封面、標題、內文、相關連結與選題參考，連結指向正確目標", async ({
  page,
}) => {
  await page.goto("/topics/summer-salads/");
  const main = page.getByRole("main");
  await expect(
    main.getByRole("img", { name: "固定資料專題的測試封面" }),
  ).toBeVisible();

  const related = main.getByRole("region", { name: "相關連結" });
  const recipeLinks = related.locator('[data-topic-related="recipes"] a');
  await expect(recipeLinks).toHaveText(["番茄炒蛋", "蒜香青菜"]);
  await expect(recipeLinks.first()).toHaveAttribute(
    "href",
    "/recipes/tomato-egg/",
  );
  const ingredientLinks = related.locator(
    '[data-topic-related="ingredients"] a',
  );
  await expect(ingredientLinks).toHaveText(["番茄", "蒜頭"]);
  await expect(ingredientLinks.first()).toHaveAttribute(
    "href",
    "/ingredients/tomato/",
  );

  const references = main.getByRole("region", { name: "選題參考" });
  await expect(references).toContainText("測試作者甲");
  await expect(references).toContainText("涼拌菜的基本原則");
  const link = references.getByRole("link").first();
  await expect(link).toHaveAttribute(
    "href",
    "https://example.com/topic-reference-a",
  );
  await expect(link).toHaveAttribute("rel", /noopener/);

  // 版面順序：封面 < 標題 < 發布日期 < 內文 < 相關連結 < 選題參考
  const tops = await Promise.all(
    [
      main.getByRole("img").first(),
      main.getByRole("heading", { level: 1 }),
      main.locator("time"),
      main.getByRole("heading", { level: 2, name: "涼拌小黃瓜" }),
      related,
      references,
    ].map(async (locator) => (await locator.boundingBox())!.y),
  );
  expect(tops).toEqual([...tops].sort((a, b) => a - b));

  await recipeLinks.first().click();
  await expect(page).toHaveURL(/\/recipes\/tomato-egg\/$/);
});

test("沒有相關連結與選題參考的專題不顯示這兩個區塊", async ({ page }) => {
  await page.goto("/topics/knife-skills/");
  await expect(page.getByRole("region", { name: "相關連結" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "選題參考" })).toHaveCount(0);
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

test("專題文章頁在桌面寬度水平置中且寬度適度放寬", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/topics/summer-salads/");
  const article = page.locator("article.topic");
  const main = page.getByRole("main");
  const articleBox = (await article.boundingBox())!;
  const mainBox = (await main.boundingBox())!;

  // 驗證 article 在 main 容器內水平居中（左右間距對稱，誤差在 2px 內）
  const leftMargin = articleBox.x - mainBox.x;
  const rightMargin =
    mainBox.x + mainBox.width - (articleBox.x + articleBox.width);
  expect(Math.abs(leftMargin - rightMargin)).toBeLessThanOrEqual(2);

  // 驗證寬度放寬至 46rem ~ 48rem（約 736px ~ 768px）
  expect(articleBox.width).toBeGreaterThanOrEqual(736);
  expect(articleBox.width).toBeLessThanOrEqual(768);
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
