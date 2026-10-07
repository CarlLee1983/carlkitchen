import { expect, test, type Locator } from "@playwright/test";

/** 圖片實際載入成功（naturalWidth 大於 0），不只是有 img 標籤。 */
async function expectLoaded(image: Locator) {
  await expect(image).toBeVisible();
  await expect
    .poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0);
}

test("關於頁在標題下方顯示站主代表插畫", async ({ page }) => {
  await page.goto("/about/");
  const illustration = page.getByRole("img", { name: /年輕廚師在爐火上甩鍋/ });
  await expectLoaded(illustration);
  await expect(illustration).not.toHaveAttribute("loading", "lazy");
});

test("關於頁〈站主審閱〉段落顯示站主頭像", async ({ page }) => {
  await page.goto("/about/");
  const section = page.locator("section", {
    has: page.getByRole("heading", { level: 2, name: "站主審閱" }),
  });
  await expectLoaded(section.getByRole("img", { name: /站主的代表人物/ }));
});
