import { expect, test } from "@playwright/test";

const url = "/recipes/tomato-egg/";

test("菜譜頁顯示基本資訊、成品圖、材料兩組與合照、編號做法與步驟圖", async ({
  page,
}) => {
  await page.goto(url);
  await expect(page.locator("header").getByText("CarlKitchen")).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 1, name: "番茄炒蛋" }),
  ).toBeVisible();
  await expect(page.getByText("蛋先炒到半熟盛起")).toBeVisible();
  const meta = page.locator(".recipe-meta");
  await expect(meta).toContainText("2 人份");
  await expect(meta).toContainText("15 分鐘");
  await expect(meta).toContainText("非湯料理");

  await expect(page.locator("figure.hero img")).toBeVisible();
  const ingredients = page.locator("aside.ingredients");
  await expect(
    ingredients.getByRole("heading", { name: "主料" }),
  ).toBeVisible();
  await expect(
    ingredients.getByRole("heading", { name: "調味" }),
  ).toBeVisible();
  await expect(ingredients.locator("figure img")).toBeVisible();
  await expect(ingredients.getByText("鹽 適量")).toBeVisible();

  await expect(page.locator("ol.steps > li")).toHaveCount(5);
  await expect(page.locator("ol.steps figure img")).toHaveCount(4);
});

test("每張料理圖都有替代文字與「AI 繪製插畫」標示", async ({ page }) => {
  await page.goto(url);
  const images = page.locator("article img");
  const count = await images.count();
  expect(count).toBe(6);
  for (let i = 0; i < count; i++) {
    await expect(images.nth(i)).toHaveAttribute("alt", /.+/);
  }
  await expect(page.locator("article figure")).toHaveCount(count);
  await expect(
    page.locator("article figure figcaption", { hasText: "AI 繪製插畫" }),
  ).toHaveCount(count);
});

test("圖片輸出響應式 WebP srcset", async ({ page }) => {
  await page.goto(url);
  const hero = page.locator("figure.hero img");
  await expect(hero).toHaveAttribute("srcset", /\.webp.*\s\d+w/);
  await expect(hero).toHaveAttribute("sizes", /.+/);
});

test("頁底有未試做聲明，且頁面沒有外部或來源連結", async ({ page }) => {
  await page.goto(url);
  await expect(page.locator("footer.disclaimer")).toContainText(
    "依公開資料由 AI 整理、站主審閱，未經試做",
  );
  const hrefs = await page
    .locator("a")
    .evaluateAll((links) => links.map((a) => a.getAttribute("href")));
  for (const href of hrefs) expect(href).toMatch(/^\//);
});

test("設計語彙：米白底、炭灰字、明體標題", async ({ page }) => {
  await page.goto(url);
  const body = await page.locator("body").evaluate((el) => {
    const style = getComputedStyle(el);
    return { bg: style.backgroundColor, color: style.color };
  });
  expect(body.bg).toBe("rgb(247, 246, 243)");
  expect(body.color).not.toBe("rgb(0, 0, 0)");
  const font = await page
    .locator("h1")
    .evaluate((el) => getComputedStyle(el).fontFamily);
  expect(font).toMatch(/serif/i);
});

test("寬螢幕材料欄為 sticky、手機為單欄", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(url);
  const aside = page.locator("aside.ingredients");
  await expect(aside).toHaveCSS("position", "sticky");
  const asideBox = await aside.boundingBox();
  const stepsBox = await page.locator("ol.steps").boundingBox();
  expect(asideBox!.x + asideBox!.width).toBeLessThanOrEqual(stepsBox!.x + 1);

  await page.setViewportSize({ width: 390, height: 800 });
  await expect(aside).toHaveCSS("position", "static");
  const mAside = await aside.boundingBox();
  const mSteps = await page.locator("ol.steps").boundingBox();
  expect(mSteps!.y).toBeGreaterThan(mAside!.y);
  expect(Math.abs(mSteps!.x - mAside!.x)).toBeLessThan(2);
});

test("列印媒體：隱藏導覽與裝飾，保留材料、做法與成品圖", async ({ page }) => {
  await page.goto(url);
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".site-header")).toBeHidden();
  await expect(page.locator("footer.disclaimer")).toBeHidden();
  await expect(page.locator("figure.hero img")).toBeVisible();
  await expect(page.locator("aside.ingredients")).toBeVisible();
  await expect(page.locator("ol.steps")).toBeVisible();
  await expect(page.locator("figure.hero figcaption")).toBeVisible();
  await expect(page.locator("aside.ingredients figure")).toBeHidden();
});
