import { expect, test, type Page } from "@playwright/test";
import { expectFocusRing, expectTouchTargets } from "./a11y-helpers";
import { publishedFixtureRecipes } from "./fixture-recipes";

const recipes = publishedFixtureRecipes();
const soups = recipes.filter((recipe) => recipe.category === "湯");
const nonSoups = recipes.filter((recipe) => recipe.category === "非湯料理");

const list = (page: Page) => page.getByRole("region", { name: "菜譜清單" });
const rows = (page: Page) => list(page).getByRole("listitem");
const hero = (page: Page) =>
  page.getByRole("region", { name: "隨機推薦菜譜" }).getByRole("link");
// 全頁只有一個會朗讀的 status（搜尋框下方的筆數提示），避免重複朗讀。
const count = (page: Page) => page.getByRole("status");

test("第一屏有日期、標題、搜尋框與配菜入口", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "CarlKitchen" }),
  ).toBeVisible();
  await expect(
    page.getByText(/\d{1,2} 月 \d{1,2} 日　週[日一二三四五六]/),
  ).toBeVisible();
  await expect(page.getByRole("search").getByRole("searchbox")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "配一桌四菜一湯" }),
  ).toHaveAttribute("href", "/meal/");
});

test("清單依菜名排序，每列有縮圖、菜名、摘要與分類標籤，草稿不出現", async ({
  page,
}) => {
  await page.goto("/");
  await expect(rows(page)).toHaveCount(recipes.length);
  for (const [i, recipe] of recipes.entries()) {
    const row = rows(page).nth(i);
    await expect(
      row.getByRole("heading", { name: recipe.title }),
    ).toBeVisible();
    await expect(row.getByText(recipe.summary)).toBeVisible();
    await expect(row.getByText(recipe.category, { exact: true })).toBeVisible();
    await expect(row.getByRole("img")).toBeVisible();
    await expect(row.getByRole("link", { name: recipe.title })).toHaveAttribute(
      "href",
      `/recipes/${recipe.id}/`,
    );
  }
  await expect(page.getByText("草稿範例")).toHaveCount(0);
});

test("分類切換即時篩選、顯示筆數並寫進網址；選回全部移除參數", async ({
  page,
}) => {
  await page.goto("/");
  await expect(count(page)).toContainText(String(recipes.length));

  await page.getByRole("button", { name: "湯", exact: true }).click();
  await expect(rows(page)).toHaveCount(soups.length);
  await expect(count(page)).toContainText(String(soups.length));
  await expect(page).toHaveURL(/[?&]category=soup(&|$)/);
  for (const [i, soup] of soups.entries()) {
    await expect(rows(page).nth(i)).toContainText(soup.title);
  }

  await page.getByRole("button", { name: "非湯料理" }).click();
  await expect(rows(page)).toHaveCount(nonSoups.length);
  await expect(count(page)).toContainText(String(nonSoups.length));
  await expect(page).toHaveURL(/[?&]category=non-soup(&|$)/);

  await page.getByRole("button", { name: "全部" }).click();
  await expect(rows(page)).toHaveCount(recipes.length);
  await expect(page).not.toHaveURL(/category=/);
});

test("開啟帶分類參數的網址會還原篩選與按鈕狀態；重新整理仍在", async ({
  page,
}) => {
  await page.goto("/?category=soup");
  await expect(rows(page)).toHaveCount(soups.length);
  await expect(
    page.getByRole("button", { name: "湯", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "全部" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await page.reload();
  await expect(rows(page)).toHaveCount(soups.length);
});

test("無法辨識的分類參數視為全部", async ({ page }) => {
  await page.goto("/?category=nonsense");
  await expect(rows(page)).toHaveCount(recipes.length);
  await expect(page.getByRole("button", { name: "全部" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("成品大圖連到存在的已發布菜譜，顯示的圖與菜名屬於所連菜譜，且不同亂數會推薦不同菜譜", async ({
  page,
}) => {
  const hrefs = new Set<string>();
  for (const value of [0, 0.999]) {
    await page.addInitScript((v) => {
      Math.random = () => v;
    }, value);
    await page.goto("/");
    await expect(hero(page)).toBeVisible();
    await expect(hero(page)).toContainText("AI 繪製插畫");
    const href = (await hero(page).getAttribute("href"))!;
    const target = recipes.find((recipe) => href === `/recipes/${recipe.id}/`);
    expect(target).toBeDefined();
    await expect(hero(page).getByRole("img")).toHaveAttribute(
      "alt",
      target!.heroAlt,
    );
    await expect(hero(page)).toContainText(target!.title);
    hrefs.add(href);
  }
  expect(hrefs.size).toBe(Math.min(2, recipes.length));
});

test("成品大圖與縮圖的載入設定：大圖優先載入，縮圖不下載超大尺寸", async ({
  page,
}) => {
  await page.goto("/");
  const img = hero(page).getByRole("img");
  await expect(img).toHaveAttribute("fetchpriority", "high");
  await expect(img).not.toHaveAttribute("loading", "lazy");
  const thumb = rows(page).first().getByRole("img");
  const srcset = (await thumb.getAttribute("srcset"))!;
  const widths = [...srcset.matchAll(/\s(\d+)w/g)].map((m) => Number(m[1]));
  expect(Math.max(...widths)).toBeLessThanOrEqual(400);
});

test("關閉 JS 時只有一張大圖（第一道菜），不會下載全部", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  const imageRequests: string[] = [];
  page.on("request", (request) => {
    if (request.resourceType() === "image") imageRequests.push(request.url());
  });
  await page.goto("/");
  await expect(hero(page)).toHaveCount(1);
  await expect(hero(page)).toHaveAttribute(
    "href",
    `/recipes/${recipes[0]!.id}/`,
  );
  await expect(hero(page).getByRole("img")).toBeVisible();
  await page.waitForLoadState("load");
  // 大圖一張；清單縮圖每列一張（可能延遲載入）；不應出現每道菜各一張額外大圖
  const heroSrc = await hero(page).getByRole("img").getAttribute("src");
  expect(imageRequests.length).toBeLessThanOrEqual(recipes.length + 1);
  expect(heroSrc).toBeTruthy();
  await context.close();
});

test("點成品大圖進入該菜譜頁", async ({ page }) => {
  await page.goto("/");
  const href = (await hero(page).getAttribute("href"))!;
  const target = recipes.find((recipe) => href === `/recipes/${recipe.id}/`)!;
  await hero(page).click();
  await expect(page).toHaveURL(new RegExp(`${href}$`));
  await expect(
    page.getByRole("heading", { level: 1, name: target.title }),
  ).toBeVisible();
});

test("無法辨識的分類參數載入時從網址清掉", async ({ page }) => {
  await page.goto("/?category=nonsense");
  await expect(page).not.toHaveURL(/category=/);
});

test("上一頁會依網址還原分類（hash 導航後選分類再返回）", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "主選單" })
    .getByRole("link", { name: "菜譜" })
    .click();
  await expect(page).toHaveURL(/\/#recipes$/);
  await page.getByRole("button", { name: "湯", exact: true }).click();
  await expect(rows(page)).toHaveCount(soups.length);
  await page.goBack();
  await expect(page).not.toHaveURL(/category=/);
  await expect(rows(page)).toHaveCount(recipes.length);
  await expect(page.getByRole("button", { name: "全部" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("導覽列「菜譜」連到首頁清單", async ({ page }) => {
  await page.goto("/recipes/tomato-egg/");
  await page
    .getByRole("navigation", { name: "主選單" })
    .getByRole("link", { name: "菜譜" })
    .click();
  await expect(page).toHaveURL(/\/#.+$/);
  await expect(
    list(page).getByRole("heading", { level: 2, name: "菜譜清單" }),
  ).toBeInViewport();
});

test("手機版依序為搜尋框、成品大圖、清單，且無水平捲動", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/");
  const search = await page.getByRole("searchbox").boundingBox();
  const heroBox = await hero(page).boundingBox();
  const listBox = await list(page).boundingBox();
  expect(heroBox!.y).toBeGreaterThan(search!.y);
  expect(listBox!.y).toBeGreaterThan(heroBox!.y);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("寬螢幕第一屏左文右圖", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto("/");
  const search = await page.getByRole("searchbox").boundingBox();
  const heroBox = await hero(page).boundingBox();
  expect(heroBox!.x).toBeGreaterThan(search!.x + search!.width);
});

test("互動元件在各寬度觸控目標至少 44×44", async ({ page }) => {
  await page.goto("/");
  await expectTouchTargets(
    page,
    page
      .getByRole("searchbox")
      .or(page.getByRole("link", { name: "配一桌四菜一湯" }))
      .or(page.getByRole("button")),
  );
});

test("鍵盤 Tab 可走到清單第一列菜名，焦點外框可見", async ({ page }) => {
  await page.goto("/");
  const firstLink = rows(page).first().getByRole("link");
  for (let i = 0; i < 20; i++) {
    if (await firstLink.evaluate((el) => el === document.activeElement)) break;
    await page.keyboard.press("Tab");
  }
  await expect(firstLink).toBeFocused();
  // 焦點外框畫在撐滿整列的 ::after 上
  await expectFocusRing(firstLink, "::after");
});

test("鍵盤可用 Enter 切換分類", async ({ page }) => {
  await page.goto("/");
  const button = page.getByRole("button", { name: "湯", exact: true });
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(rows(page)).toHaveCount(soups.length);
  await expectFocusRing(button);
});
