import { expect, test } from "@playwright/test";
import { expectFocusRing, tabTo } from "./a11y-helpers";

for (const path of ["/", "/recipes/tomato-egg/", "/meal/", "/about/"]) {
  test(`${path} 頁首顯示盤與葉及完整站名，並能返回首頁`, async ({ page }) => {
    await page.goto(path);
    const brand = page
      .getByRole("navigation", { name: "主選單" })
      .getByRole("link", { name: "煮奔", exact: true });
    await expect(brand).toBeVisible();
    await expect(brand.locator("img")).toBeVisible();
    await expect(brand).toContainText("煮奔");
    const roman = brand.getByText("TSU-PNG", { exact: true });
    await expect(roman).toBeVisible();
    await expect(roman).toHaveAttribute("aria-hidden", "true");
    await expect(brand.locator("img")).toHaveAttribute("alt", "");
    await expect(brand.locator("img")).toHaveAttribute("src", "/logo-mark.svg");
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute(
      "href",
      "/logo-mark.svg",
    );

    const homeUrl = new URL("/", page.url()).href;
    await tabTo(page, brand);
    await expectFocusRing(brand);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(homeUrl);
  });
}

test("手機頁首可讀完整站名且沒有水平溢出", async ({ page }) => {
  for (const width of [360, 390, 430]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    const brand = page.getByRole("link", { name: "煮奔", exact: true });
    await expect(brand).toBeInViewport();
    await expect(brand.getByText("煮奔", { exact: true })).toBeInViewport();
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(overflow, `${width}px 有水平溢出`).toBe(false);
  }
});

test("首頁與關於頁的 title 帶站名", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("煮奔");
  await page.goto("/about/");
  await expect(page).toHaveTitle("關於這個網站｜煮奔");
  await page.goto("/recipes/tomato-egg/");
  await expect(page).toHaveTitle("番茄炒蛋｜煮奔");
  await page.goto("/ingredients/tomato/");
  await expect(page).toHaveTitle("番茄｜食材介紹｜煮奔");
});

// 直排是版面結果：量到的高大於寬，而不是檢查 CSS 屬性值。
for (const width of [1280, 768, 390]) {
  test(`${width}px 寬首頁 h1 為直排（高大於寬）`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const box = await page
      .getByRole("heading", { level: 1, name: "煮奔" })
      .boundingBox();
    expect(box!.height).toBeGreaterThan(box!.width);
  });
}
