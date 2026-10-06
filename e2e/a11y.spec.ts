import { expect, test, type Page } from "@playwright/test";
import {
  expectNoAxeViolations,
  expectNoHorizontalScroll,
} from "./a11y-helpers";
import { publishedFixtureRecipes } from "./fixture-recipes";

// 預設站台的四個頁面；配菜頁在 meal 站台，見 meal.spec.ts 的「無障礙」。
// 404 用一個不存在的網址，確認 preview 真的回 404 狀態碼與這個頁面。
const pages = [
  { name: "首頁", path: "/" },
  { name: "菜譜頁", path: "/recipes/tomato-egg/" },
  { name: "關於頁", path: "/about/" },
  { name: "404 頁", path: "/no-such-page/" },
];

const recipes = publishedFixtureRecipes();
const box = (page: Page) => page.getByRole("searchbox");

test.describe("關於頁", () => {
  test("說明來源、AI 製作與站主審閱流程，且不列任何外部連結", async ({
    page,
  }) => {
    await page.goto("/about/");
    await expect(
      page.getByRole("heading", { level: 1, name: "關於這個網站" }),
    ).toBeVisible();
    for (const text of ["公開資料", "AI", "插畫", "站主", "試做"]) {
      await expect(page.getByRole("main")).toContainText(text);
    }
    const hrefs = await page
      .getByRole("main")
      .getByRole("link")
      .evaluateAll((links) => links.map((a) => a.getAttribute("href")));
    expect(hrefs.filter((href) => /^https?:/.test(href ?? ""))).toEqual([]);
  });

  test("可從頁首導覽進入", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("navigation", { name: "主選單" })
      .getByRole("link", { name: "關於" })
      .click();
    await expect(page).toHaveURL(/\/about\/$/);
  });
});

test.describe("404 頁", () => {
  test("不存在的網址回 404 狀態碼，並引導回首頁", async ({ page }) => {
    const response = await page.goto("/no-such-page/");
    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole("heading", { level: 1, name: "找不到頁面" }),
    ).toBeVisible();
    await page.getByRole("main").getByRole("link", { name: "回首頁" }).click();
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe("axe（WCAG 2.2 AA）", () => {
  for (const { name, path } of pages) {
    test(`${name} 零違規`, async ({ page }) => {
      await page.goto(path);
      await expectNoAxeViolations(page, name);
    });
  }

  test("首頁搜尋中零違規", async ({ page }) => {
    await page.goto("/");
    await box(page).fill(recipes[0]!.title);
    await expect(page.getByRole("status")).toContainText("符合");
    await expectNoAxeViolations(page, "首頁搜尋中");
  });

  test("首頁零筆狀態零違規", async ({ page }) => {
    await page.goto("/");
    await box(page).fill("zzzz");
    await expect(page.getByText("找不到符合")).toBeVisible();
    await expectNoAxeViolations(page, "首頁零筆");
  });

  test("首頁切換到湯分類零違規", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "湯", exact: true }).click();
    await expectNoAxeViolations(page, "首頁湯分類");
  });
});

test.describe("多寬度版面", () => {
  for (const { name, path } of pages) {
    test(`${name} 在 360、390、430、1366、1920 寬度沒有水平捲動`, async ({
      page,
    }) => {
      await expectNoHorizontalScroll(page, path);
    });
  }
});

test.describe("鍵盤", () => {
  test("只用鍵盤即可搜尋並清除條件，焦點可見", async ({ page }) => {
    await page.goto("/");
    // 從頁首往後 Tab 直到搜尋框取得焦點
    for (let i = 0; i < 10; i++) {
      if (await box(page).evaluate((el) => el === document.activeElement))
        break;
      await page.keyboard.press("Tab");
    }
    await expect(box(page)).toBeFocused();
    expect(
      await box(page).evaluate((el) => getComputedStyle(el).outlineStyle),
    ).not.toBe("none");

    await page.keyboard.type("zzzz");
    await expect(page.getByText("找不到符合")).toBeVisible();
    const clear = page.getByRole("button", { name: "清除條件" });
    for (let i = 0; i < 10; i++) {
      if (await clear.evaluate((el) => el === document.activeElement)) break;
      await page.keyboard.press("Tab");
    }
    await expect(clear).toBeFocused();
    expect(
      await clear.evaluate((el) => getComputedStyle(el).outlineStyle),
    ).not.toBe("none");
    await page.keyboard.press("Enter");
    await expect(box(page)).toHaveValue("");
  });

  test("只用鍵盤即可切換分類（Tab 抵達，空白鍵啟動）", async ({ page }) => {
    await page.goto("/");
    const soup = page.getByRole("button", { name: "湯", exact: true });
    for (let i = 0; i < 20; i++) {
      if (await soup.evaluate((el) => el === document.activeElement)) break;
      await page.keyboard.press("Tab");
    }
    await expect(soup).toBeFocused();
    await page.keyboard.press("Space");
    await expect(soup).toHaveAttribute("aria-pressed", "true");
    expect(
      await soup.evaluate((el) => getComputedStyle(el).outlineStyle),
    ).not.toBe("none");
  });
});

// 觸控目標 44×44：分類切換、搜尋框、配菜按鈕已分別由 homepage.spec.ts
// 「互動元件觸控目標至少 44×44」、search.spec.ts 與 meal.spec.ts「無障礙」涵蓋；
// 頁首連結由 recipe-page.spec.ts 涵蓋，這裡只補關於頁新增的導覽連結。
test("頁首導覽連結（含關於）觸控目標至少 44×44", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/about/");
  for (const link of await page
    .getByRole("navigation", { name: "主選單" })
    .getByRole("link")
    .all()) {
    const size = await link.boundingBox();
    expect(size!.width).toBeGreaterThanOrEqual(44);
    expect(size!.height).toBeGreaterThanOrEqual(44);
  }
});
