import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { sizesSlot } from "./image-helpers";

const url = "/recipes/tomato-egg/";

// 數量由固定菜譜資料算出，不寫死；YAML 為單層縮排的固定格式，逐行計數即可。
const yaml = readFileSync(
  "tests/fixtures/recipes/tomato-egg/recipe.yaml",
  "utf8",
);
const count = (pattern: RegExp) => (yaml.match(pattern) ?? []).length;
const stepCount = count(/^ {2}- text:/gm);
const stepImageCount = count(/^ {4}image:/gm);
const hasHero = /^hero:/m.test(yaml);
const hasIngredientsPhoto = /^ingredientsPhoto:/m.test(yaml);
const imageCount =
  stepImageCount + Number(hasHero) + Number(hasIngredientsPhoto);

test("菜譜頁顯示基本資訊、成品圖、材料兩組與合照、編號做法與步驟圖", async ({
  page,
}) => {
  await page.goto(url);
  await expect(
    page.getByRole("navigation", { name: "主選單" }).getByText("煮奔"),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 1, name: "番茄炒蛋" }),
  ).toBeVisible();
  await expect(page.getByText("蛋先炒到半熟盛起")).toBeVisible();
  await expect(page.getByText("2 人份")).toBeVisible();
  await expect(page.getByText("15 分鐘")).toBeVisible();
  await expect(page.getByText("蔬菜・蛋豆", { exact: true })).toBeVisible();

  await expect(
    page.getByRole("article").getByRole("figure").first().getByRole("img"),
  ).toBeVisible();

  const ingredients = page.getByRole("complementary", { name: "材料" });
  await expect(
    ingredients.getByRole("heading", { name: "主料" }),
  ).toBeVisible();
  await expect(
    ingredients.getByRole("heading", { name: "調味" }),
  ).toBeVisible();
  await expect(ingredients.getByRole("figure").getByRole("img")).toBeVisible();
  await expect(ingredients.getByText("鹽 適量")).toBeVisible();

  const method = page.getByRole("region", { name: "做法" });
  await expect(method.getByRole("listitem")).toHaveCount(stepCount);
  await expect(method.getByRole("figure")).toHaveCount(stepImageCount);
});

test("每張料理圖都有替代文字，且不加圖說", async ({ page }) => {
  await page.goto(url);
  const article = page.getByRole("article");
  const images = article.getByRole("img");
  await expect(images).toHaveCount(imageCount);
  for (let i = 0; i < imageCount; i++) {
    await expect(images.nth(i)).toHaveAttribute("alt", /.+/);
  }
  const figures = article.getByRole("figure");
  await expect(figures).toHaveCount(imageCount);
  for (let i = 0; i < imageCount; i++) {
    await expect(figures.nth(i)).not.toContainText("AI 繪製插畫");
  }
});

test("相關專題列出引用這道菜的已發布文章與短介，不納入菜譜搜尋內容", async ({
  page,
}) => {
  await page.goto(url);
  const related = page.getByRole("region", { name: "相關專題" });
  await expect(
    related.getByRole("link", { name: "夏天的涼拌菜" }),
  ).toHaveAttribute("href", "/topics/summer-salads/");
  await expect(related).toContainText("三種十分鐘內完成的涼拌做法。");
  await expect(related.getByRole("link")).toHaveCount(1);
  await expect(related.locator("[data-pagefind-body]")).toHaveCount(0);

  await page.goto("/recipes/egg-drop-soup/");
  await expect(
    page.getByRole("region", { name: "相關專題" }).getByRole("link"),
  ).toHaveAttribute("href", "/topics/rice-basics/");

  await page.goto("/recipes/fried-noodles/");
  await expect(page.getByRole("region", { name: "相關專題" })).toHaveCount(0);
});

test("圖片輸出響應式 WebP srcset；成品圖優先載入、sizes 與版面一致", async ({
  page,
}) => {
  await page.goto(url);
  const hero = page.getByRole("article").getByRole("img").first();
  await expect(hero).toHaveAttribute("srcset", /\.webp.*\s\d+w/);
  await expect(hero).toHaveAttribute("sizes", /44rem/);
  await expect(hero).not.toHaveAttribute("loading", "lazy");
});

for (const width of [390, 800, 1366]) {
  test(`成品圖的 sizes 與實際顯示寬度一致（視窗 ${width}px），瀏覽器不會挑過大的圖`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(url);
    const hero = page.getByRole("article").getByRole("img").first();
    const { slot, rendered } = await sizesSlot(hero);
    expect(Math.abs(slot - rendered)).toBeLessThanOrEqual(1);
  });
}

test("頁底有僅供參考聲明，且頁面沒有外部或來源連結", async ({ page }) => {
  await page.goto(url);
  await expect(page.getByRole("contentinfo")).toContainText(
    "菜譜整理自公開資料、經站主審閱，份量與時間僅供參考",
  );
  const hrefs = await page
    .getByRole("link")
    .evaluateAll((links) => links.map((a) => a.getAttribute("href")));
  for (const href of hrefs) expect(href).toMatch(/^\/(?!\/)/);
});

test("設計語彙：米白底、炭灰字、標題用明體、內文用黑體", async ({ page }) => {
  await page.goto(url);
  const body = await page.locator("body").evaluate((el) => {
    const style = getComputedStyle(el);
    return {
      bg: style.backgroundColor,
      color: style.color,
      font: style.fontFamily,
    };
  });
  expect(body.bg).toBe("rgb(247, 246, 243)");
  expect(body.color).not.toBe("rgb(0, 0, 0)");
  expect(body.font).toContain("PingFang TC");
  const headingFont = await page
    .getByRole("heading", { level: 1 })
    .evaluate((el) => getComputedStyle(el).fontFamily);
  expect(headingFont).toContain("Songti TC");
  expect(headingFont).not.toContain("PingFang TC");
});

test("寬螢幕捲動做法時材料欄仍在視窗內；手機為單欄", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(url);
  const aside = page.getByRole("complementary", { name: "材料" });
  const steps = page.getByRole("region", { name: "做法" });
  const asideBox = await aside.boundingBox();
  const stepsBox = await steps.boundingBox();
  expect(asideBox!.x + asideBox!.width).toBeLessThanOrEqual(stepsBox!.x + 1);

  await page.getByRole("contentinfo").scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await expect(aside).toBeInViewport();

  await page.setViewportSize({ width: 390, height: 800 });
  await page.evaluate(() => window.scrollTo(0, 0));
  const mAside = await aside.boundingBox();
  const mSteps = await steps.boundingBox();
  expect(mSteps!.y).toBeGreaterThan(mAside!.y);
  expect(Math.abs(mSteps!.x - mAside!.x)).toBeLessThan(2);
});

test("頁首連結觸控目標至少 44×44", async ({ page }) => {
  await page.goto(url);
  const links = page
    .getByRole("navigation", { name: "主選單" })
    .getByRole("link");
  const total = await links.count();
  for (let i = 0; i < total; i++) {
    const box = await links.nth(i).boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
});

test("沒有列印圖的菜譜不顯示列印；列印媒體仍隱藏導覽與步驟圖，且一頁印完", async ({
  page,
}) => {
  // 番茄炒蛋已有正式列印圖，這則改看沒有圖的固定菜譜。
  await page.goto("/recipes/garlic-greens/");
  await expect(page.getByRole("button", { name: "列印" })).toHaveCount(0);

  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("navigation")).toBeHidden();
  await expect(page.getByRole("contentinfo")).toBeHidden();
  const article = page.getByRole("article");
  await expect(article.getByRole("figure").first()).toBeVisible();
  await expect(page.getByRole("complementary", { name: "材料" })).toBeVisible();
  await expect(
    page.getByRole("complementary", { name: "材料" }).getByRole("figure"),
  ).toBeHidden();
  const method = page.getByRole("region", { name: "做法" });
  await expect(method).toBeVisible();
  const stepFigures = method.getByRole("figure");
  for (let i = 0; i < stepImageCount; i++) {
    await expect(stepFigures.nth(i)).toBeHidden();
  }

  const pdf = await page.pdf({ format: "A4" });
  const pages = pdf.toString("latin1").match(/\/Type\s*\/Page(?!s)/g) ?? [];
  expect(pages.length).toBe(1);
});

for (const width of [390, 1280]) {
  test(`菜譜主圖在內容區置中（${width}px）`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/recipes/tomato-egg/");
    const article = await page.getByRole("article").boundingBox();
    const hero = await page.locator(".hero img").boundingBox();
    expect(
      Math.abs(hero!.x + hero!.width / 2 - (article!.x + article!.width / 2)),
    ).toBeLessThanOrEqual(1);
  });
}
