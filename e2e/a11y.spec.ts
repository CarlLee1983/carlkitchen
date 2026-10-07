import { expect, test, type Page } from "@playwright/test";
import {
  expectNoAxeViolations,
  expectFocusRing,
  expectNoHorizontalScroll,
  expectTouchTargets,
  tabTo,
  WIDTHS,
} from "./a11y-helpers";
import { publishedFixtureRecipes } from "./fixture-recipes";

// 預設站台的頁面；配菜頁在 meal 站台，見 meal.spec.ts 的「無障礙」。
// 404 用一個不存在的網址，確認 preview 真的回 404 狀態碼與這個頁面。
const pages = [
  { name: "首頁", path: "/" },
  { name: "菜譜頁", path: "/recipes/tomato-egg/" },
  { name: "食材條目頁", path: "/ingredients/tomato/" },
  { name: "關於頁", path: "/about/" },
  { name: "404 頁", path: "/no-such-page/" },
];

const recipes = publishedFixtureRecipes();
const box = (page: Page) => page.getByRole("searchbox");

test.describe("關於頁", () => {
  test("說明來源、插畫與站主審閱流程，且不列任何外部連結", async ({ page }) => {
    await page.goto("/about/");
    await expect(
      page.getByRole("heading", { level: 1, name: "關於這個網站" }),
    ).toBeVisible();
    for (const text of ["公開資料", "插畫", "站主", "試做"]) {
      await expect(page.getByRole("main")).toContainText(text);
    }
    const hrefs = await page
      .getByRole("main")
      .getByRole("link")
      .evaluateAll((links) => links.map((a) => a.getAttribute("href")));
    // 白名單：只允許站內路徑（單一 `/` 開頭），擋下 `//`、`https:`、`mailto:` 等。
    expect(hrefs.filter((href) => !/^\/(?!\/)/.test(href ?? ""))).toEqual([]);
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

  test("首頁切換到湯篩選零違規", async ({ page }) => {
    await page.goto("/");
    const soup = page.getByRole("button", { name: "湯", exact: true });
    await soup.click();
    await expect(soup).toHaveAttribute("aria-pressed", "true");
    await expectNoAxeViolations(page, "首頁湯篩選");
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
    await tabTo(page, box(page));
    await expectFocusRing(box(page));

    await page.keyboard.type("zzzz");
    await expect(page.getByText("找不到符合")).toBeVisible();
    const clear = page.getByRole("button", { name: "清除條件" });
    await tabTo(page, clear);
    await expectFocusRing(clear);
    await page.keyboard.press("Enter");
    await expect(box(page)).toHaveValue("");
  });

  test("只用鍵盤即可切換篩選（Tab 抵達，空白鍵啟動）", async ({ page }) => {
    await page.goto("/");
    const soup = page.getByRole("button", { name: "湯", exact: true });
    await tabTo(page, soup);
    await page.keyboard.press("Space");
    await expect(soup).toHaveAttribute("aria-pressed", "true");
    await expectFocusRing(soup);
  });
});

// 觸控目標 44×44：篩選切換與首頁互動元件在 homepage.spec.ts、配菜按鈕在 meal.spec.ts，
// 這裡量頁首導覽連結（含關於）與手機版選單按鈕，在五個寬度各量一次。
test("頁首導覽連結（含關於）在各寬度觸控目標至少 44×44", async ({ page }) => {
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/about/");
    const toggleBtn = page.getByRole("button", { name: "選單" });
    if (await toggleBtn.isVisible()) {
      const btnBox = await toggleBtn.boundingBox();
      expect(btnBox!.width, `${width}px 選單按鈕寬`).toBeGreaterThanOrEqual(44);
      expect(btnBox!.height, `${width}px 選單按鈕高`).toBeGreaterThanOrEqual(
        44,
      );
      await toggleBtn.click();
    }
    const navLinks = await page
      .getByRole("navigation", { name: "主選單" })
      .getByRole("link")
      .all();
    expect(navLinks.length, `${width}px 找不到導覽連結`).toBeGreaterThan(0);
    for (const link of navLinks) {
      if (!(await link.isVisible())) continue;
      const box = await link.boundingBox();
      const name = await link.evaluate((el) => el.outerHTML.slice(0, 80));
      expect(box!.width, `${width}px ${name} 寬`).toBeGreaterThanOrEqual(44);
      expect(box!.height, `${width}px ${name} 高`).toBeGreaterThanOrEqual(44);
    }
  }
});

test.describe("配菜候選不足頁", () => {
  test("按下抽選後的提示狀態 axe 零違規", async ({ page }) => {
    await page.goto("/meal/");
    await page.getByRole("button", { name: "重新抽選" }).click();
    await expect(page.getByRole("status")).toContainText("候選池的非湯菜不足");
    await expectNoAxeViolations(page, "配菜頁候選不足");
  });
});
