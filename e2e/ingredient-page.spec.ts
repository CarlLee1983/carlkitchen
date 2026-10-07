import { expect, test } from "@playwright/test";

test("讀者能閱讀食材條目、核對來源並前往相關菜譜", async ({ page }) => {
  await page.goto("/ingredients/tomato/");
  await expect(
    page.getByRole("heading", { level: 1, name: "番茄" }),
  ).toBeVisible();
  for (const section of [
    "選用",
    "處理",
    "保存",
    "用途",
    "臺灣產期與賞味",
    "公開來源",
  ]) {
    await expect(page.getByRole("heading", { name: section })).toBeVisible();
  }
  await expect(page.getByText("12 月至翌年 4 月").first()).toBeVisible();
  await expect(page.getByRole("link", { name: /測試來源/ })).toHaveAttribute(
    "href",
    "https://example.com/ingredient-test",
  );
  await page.getByRole("link", { name: /番茄炒蛋/ }).click();
  await expect(page).toHaveURL(/\/recipes\/tomato-egg\/$/);
});

test("草稿食材網址在正式建置回 404", async ({ page }) => {
  const response = await page.goto("/ingredients/draft-ingredient/");
  expect(response?.status()).toBe(404);
});

test("手機上的食材條目可讀且沒有水平溢出", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ingredients/tomato/");
  await expect(
    page.getByRole("heading", { level: 1, name: "番茄" }),
  ).toBeVisible();
  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  expect(overflows).toBe(false);
});

test("酒精與過敏原提醒在獨立區塊清楚顯示", async ({ page }) => {
  await page.goto("/ingredients/soy-sauce/");
  const notices = page.getByRole("region", { name: "食用提醒" });
  await expect(notices).toContainText("測試產品標示含大豆及小麥");
  await expect(notices).toContainText("酒精：測試產品的原料標示含酒精");
  await expect(
    notices.getByRole("heading", { name: "食用提醒" }),
  ).toBeVisible();
});
