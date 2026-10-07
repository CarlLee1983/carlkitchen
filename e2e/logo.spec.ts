import { expect, test } from "@playwright/test";
import { expectFocusRing, tabTo } from "./a11y-helpers";

for (const path of ["/", "/recipes/tomato-egg/", "/meal/", "/about/"]) {
  test(`${path} 頁首顯示盤與葉及完整站名，並能返回首頁`, async ({ page }) => {
    await page.goto(path);
    const brand = page
      .getByRole("navigation", { name: "主選單" })
      .getByRole("link", { name: "CarlKitchen", exact: true });
    await expect(brand).toBeVisible();
    await expect(brand.locator("img")).toBeVisible();
    await expect(brand).toContainText("CarlKitchen");
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
    const brand = page.getByRole("link", { name: "CarlKitchen", exact: true });
    await expect(brand).toBeInViewport();
    await expect(brand.getByText("CarlKitchen")).toBeInViewport();
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(overflow, `${width}px 有水平溢出`).toBe(false);
  }
});
