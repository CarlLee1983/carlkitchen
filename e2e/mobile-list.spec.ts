import { expect, test, type Locator, type Page } from "@playwright/test";
import { expectNoOverflowNow, expectTouchTargets } from "./a11y-helpers";
import { publishedFixtureRecipes } from "./fixture-recipes";

const recipes = publishedFixtureRecipes();

const list = (page: Page) => page.getByRole("region", { name: "菜譜清單" });
const rows = (page: Page) => list(page).getByRole("listitem");
const filterBar = (page: Page) => page.getByRole("group", { name: "篩選" });
const top = async (locator: Locator) => (await locator.boundingBox())!.y;
const bottom = async (locator: Locator) => {
  const box = (await locator.boundingBox())!;
  return box.y + box.height;
};

test.describe("手機版（390×844）", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("第一個畫面就看得到篩選列", async ({ page }) => {
    await page.goto("/");
    expect(await top(filterBar(page))).toBeGreaterThanOrEqual(0);
    expect(await bottom(filterBar(page))).toBeLessThanOrEqual(844);
  });

  test("成品大圖寬高比約 2:1", async ({ page }) => {
    await page.goto("/");
    const img = (await page
      .getByRole("region", { name: "隨機看看一道菜" })
      .getByRole("img")
      .boundingBox())!;
    expect(img.width / img.height).toBeCloseTo(2, 1);
  });

  test("清單列的摘要只佔 1 行高，完整文字仍在 DOM", async ({ page }) => {
    await page.goto("/");
    for (const recipe of recipes) {
      const summary = rows(page)
        .filter({ hasText: recipe.title })
        .locator(".row-summary");
      await expect(summary).toHaveText(recipe.summary);
      const { height, lineHeight } = await summary.evaluate((el) => ({
        height: el.getBoundingClientRect().height,
        lineHeight: parseFloat(getComputedStyle(el).lineHeight),
      }));
      expect(height, recipe.title).toBeLessThanOrEqual(lineHeight + 1);
    }
  });

  test("捲到清單中段後篩選列固定在畫面頂部", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 400 });
    await page.goto("/");
    const natural = await top(filterBar(page));
    expect(natural).toBeGreaterThan(0);
    await page.evaluate((y) => window.scrollTo(0, y + 120), natural);
    await expect
      .poll(async () => Math.round(await top(filterBar(page))))
      .toBe(0);
  });

  test("搜尋中仍收起成品大圖", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("searchbox").fill(recipes[0]!.title);
    await expect(
      page.getByRole("region", { name: "隨機看看一道菜" }),
    ).toBeHidden();
  });
});

test.describe("篩選列折成兩行時", () => {
  // 360 寬放不下 5 個選項，篩選列折行變高；視窗縮矮，固定菜譜才夠長可以捲。
  test.use({ viewport: { width: 360, height: 300 } });

  test("切換篩選後第一列緊接在固定的篩選列下方，不被遮住", async ({ page }) => {
    await page.goto("/");
    const bar = filterBar(page);
    const buttons = bar.getByRole("button");
    const first = (await buttons.first().boundingBox())!;
    const last = (await buttons.last().boundingBox())!;
    expect(last.y, "前提：篩選列折成多行").toBeGreaterThan(first.y);

    const natural = await top(bar);
    for (const name of ["蔬菜菜", "蛋白質菜", "湯"]) {
      await page.evaluate((y) => window.scrollTo(0, y + 120), natural);
      await expect
        .poll(async () => Math.round(await top(bar)), { message: "固定在頂端" })
        .toBe(0);

      await buttons.filter({ hasText: new RegExp(`^${name}$`) }).click();
      const firstRow = rows(page).filter({ visible: true }).first();
      await expect(firstRow).toBeVisible();
      expect(await top(firstRow), name).toBeGreaterThanOrEqual(
        (await bottom(bar)) - 1,
      );
    }
  });
});

test("360、390、430 寬度沒有水平捲動，篩選按鈕觸控目標達標", async ({
  page,
}) => {
  for (const width of [360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    await expectNoOverflowNow(page, `首頁於 ${width}px`);
  }
  await expectTouchTargets(page, filterBar(page).getByRole("button"));
});

test.describe("寬螢幕 1366 版面不變", () => {
  test.use({ viewport: { width: 1366, height: 900 } });

  test("摘要完整顯示，不截成 1 行", async ({ page }) => {
    await page.goto("/");
    for (const recipe of recipes) {
      const summary = rows(page)
        .filter({ hasText: recipe.title })
        .locator(".row-summary");
      const { scrollHeight, clientHeight } = await summary.evaluate((el) => ({
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
      }));
      expect(scrollHeight, recipe.title).toBeLessThanOrEqual(clientHeight + 1);
    }
  });

  test("篩選列隨頁面捲動，不固定在頂部", async ({ page }) => {
    await page.goto("/");
    const natural = await top(filterBar(page));
    expect(natural).toBeGreaterThan(300);
    await page.evaluate(() => window.scrollTo(0, 300));
    await expect
      .poll(async () => Math.round(await top(filterBar(page))))
      .toBe(Math.round(natural - 300));
  });
});
