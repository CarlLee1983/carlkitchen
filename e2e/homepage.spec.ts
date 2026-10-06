import { expect, test, type Page } from "@playwright/test";
import { publishedFixtureRecipes } from "./fixture-recipes";

const recipes = publishedFixtureRecipes();
const soups = recipes.filter((recipe) => recipe.category === "湯");
const nonSoups = recipes.filter((recipe) => recipe.category === "非湯料理");

const list = (page: Page) => page.getByRole("region", { name: "全部菜譜" });
const rows = (page: Page) => list(page).getByRole("listitem");
const hero = (page: Page) =>
  page.getByRole("region", { name: "隨機推薦菜譜" }).getByRole("link");
const count = (page: Page) => list(page).getByRole("status");

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

test("搜尋框此時只是外觀：輸入不篩選清單", async ({ page }) => {
  await page.goto("/");
  const box = page.getByRole("searchbox");
  await box.fill("湯");
  await box.press("Enter");
  await expect(page).toHaveURL(/\/$/);
  await expect(rows(page)).toHaveCount(recipes.length);
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

test("成品大圖連到存在的已發布菜譜，且不同亂數會推薦不同菜譜", async ({
  page,
}) => {
  const hrefs = new Set<string>();
  for (const value of [0, 0.999]) {
    await page.addInitScript((v) => {
      Math.random = () => v;
    }, value);
    await page.goto("/");
    await expect(hero(page)).toBeVisible();
    await expect(hero(page).getByRole("img")).toHaveAttribute("alt", /.+/);
    await expect(hero(page)).toContainText("AI 繪製插畫");
    hrefs.add((await hero(page).getAttribute("href"))!);
  }
  const valid = recipes.map((recipe) => `/recipes/${recipe.id}/`);
  for (const href of hrefs) expect(valid).toContain(href);
  expect(hrefs.size).toBe(Math.min(2, recipes.length));
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

test("導覽列「菜譜」連到首頁清單", async ({ page }) => {
  await page.goto("/recipes/tomato-egg/");
  await page
    .getByRole("navigation", { name: "主選單" })
    .getByRole("link", { name: "菜譜" })
    .click();
  await expect(page).toHaveURL(/\/#.+$/);
  await expect(
    list(page).getByRole("heading", { level: 2, name: "全部菜譜" }),
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

test("互動元件觸控目標至少 44×44", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/");
  const targets = [
    page.getByRole("searchbox"),
    page.getByRole("link", { name: "配一桌四菜一湯" }),
    ...(await page.getByRole("button").all()),
  ];
  for (const target of targets) {
    const box = await target.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
});

test("鍵盤可聚焦分類按鈕並看到焦點外框", async ({ page }) => {
  await page.goto("/");
  const button = page.getByRole("button", { name: "湯", exact: true });
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(rows(page)).toHaveCount(soups.length);
  const outline = await button.evaluate(
    (el) => getComputedStyle(el).outlineStyle,
  );
  expect(outline).not.toBe("none");
});
