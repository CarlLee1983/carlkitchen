import { expect, test, type Page } from "@playwright/test";
import { expectNoOverflowNow, expectTouchTargets } from "./a11y-helpers";
import { publishedFixtureRecipes } from "./fixture-recipes";

const recipes = publishedFixtureRecipes();

const list = (page: Page) => page.getByRole("region", { name: "菜譜清單" });
const rows = (page: Page) => list(page).getByRole("listitem");
const filterBar = (page: Page) => page.getByRole("group", { name: "篩選" });
const top = async (locator: ReturnType<typeof filterBar>) =>
  (await locator.boundingBox())!.y;

test.describe("手機版（390×844）", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("第一個畫面就看得到篩選列", async ({ page }) => {
    await page.goto("/");
    const bar = (await filterBar(page).boundingBox())!;
    expect(bar.y).toBeGreaterThanOrEqual(0);
    expect(bar.y + bar.height).toBeLessThanOrEqual(844);
  });

  test("首屏收緊：主內容上方 24px、成品大圖 2:1", async ({ page }) => {
    await page.goto("/");
    const mainPadding = await page
      .locator("main")
      .evaluate((el) => parseFloat(getComputedStyle(el).paddingTop));
    expect(mainPadding).toBe(24);
    const img = (await page
      .getByRole("region", { name: "隨機推薦菜譜" })
      .getByRole("img")
      .boundingBox())!;
    expect(img.width / img.height).toBeCloseTo(2, 1);
  });

  test("intro 到清單的間距合計 32px", async ({ page }) => {
    await page.goto("/");
    const gap = await page.evaluate(() => {
      const px = (el: Element, prop: "marginBottom" | "paddingTop") =>
        parseFloat(getComputedStyle(el)[prop]);
      return (
        px(document.querySelector("[data-intro]")!, "marginBottom") +
        px(document.querySelector("#recipes")!, "paddingTop")
      );
    });
    expect(gap).toBe(32);
  });

  test("清單列的摘要只顯示 1 行並帶省略號，完整文字仍在 DOM", async ({
    page,
  }) => {
    await page.goto("/");
    for (const recipe of recipes) {
      const summary = rows(page)
        .filter({ hasText: recipe.title })
        .locator(".row-summary");
      const { height, lineHeight, ellipsis } = await summary.evaluate((el) => {
        const style = getComputedStyle(el);
        return {
          height: el.getBoundingClientRect().height,
          lineHeight: parseFloat(style.lineHeight),
          ellipsis:
            el.scrollHeight > el.clientHeight ||
            el.scrollWidth > el.clientWidth,
        };
      });
      expect(height, recipe.title).toBeLessThanOrEqual(lineHeight + 1);
      // 摘要夠長時被截斷，文字仍完整保留
      await expect(summary).toHaveText(recipe.summary);
      if (ellipsis) {
        expect(
          await summary.evaluate((el) => getComputedStyle(el).overflow),
        ).toBe("hidden");
      }
    }
  });

  test("捲到清單中段後篩選列固定在畫面頂部，切換篩選後第一列不被遮住", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 400 });
    await page.goto("/");
    const natural = await top(filterBar(page));
    expect(natural).toBeGreaterThan(0);
    await page.evaluate((y) => window.scrollTo(0, y + 120), natural);
    await expect
      .poll(async () => Math.round(await top(filterBar(page))))
      .toBe(0);

    await page.getByRole("button", { name: "湯", exact: true }).click();
    await expect(rows(page).filter({ visible: true })).not.toHaveCount(0);
    const barBottom = (await filterBar(page).boundingBox())!;
    const firstVisible = (await rows(page)
      .filter({ visible: true })
      .first()
      .boundingBox())!;
    expect(firstVisible.y).toBeGreaterThanOrEqual(
      barBottom.y + barBottom.height - 1,
    );
  });

  test("搜尋中仍收起成品大圖", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("searchbox").fill(recipes[0]!.title);
    await expect(
      page.getByRole("region", { name: "隨機推薦菜譜" }),
    ).toBeHidden();
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

test("寬螢幕 1366 寬的列版面與首屏不變：摘要不截斷、篩選列不固定", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto("/");
  const summary = rows(page).first().locator(".row-summary");
  expect(
    await summary.evaluate((el) => getComputedStyle(el).webkitLineClamp),
  ).toBe("none");
  expect(
    await filterBar(page).evaluate(
      (el) => getComputedStyle(el.parentElement!).position,
    ),
  ).toBe("static");
  const mainPadding = await page
    .locator("main")
    .evaluate((el) => parseFloat(getComputedStyle(el).paddingTop));
  expect(mainPadding).toBe(48);
});
