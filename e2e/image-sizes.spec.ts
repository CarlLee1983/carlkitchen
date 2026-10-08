import { expect, test } from "@playwright/test";
import { sizesSlot } from "./image-helpers";

// 各頁插畫的 sizes 不得低估實際顯示寬度，否則瀏覽器挑太小的圖、畫面模糊。
// 高估只是多下載，由首頁與菜譜頁的 ±1px 測試在代表寬度把關。
const pages = [
  "/",
  "/recipes/tomato-egg/",
  "/about/",
  "/topics/rice-basics/",
  "/topics/summer-salads/",
  "/solar-terms/",
];
const widths = [360, 390, 640, 651, 800, 1023, 1024, 1366];

for (const path of pages) {
  test(`${path} 的插畫 sizes 在各視窗寬度都不低估實際寬度`, async ({
    page,
  }) => {
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      // 正文 Markdown 圖不包在 figure 裡，也要檢查其實際顯示寬度。
      if (path === "/topics/summer-salads/") {
        await expect(page.locator(".topic .body img")).toHaveCount(4);
      }
      const images = await page
        .locator("figure.illustration img, .topic .body img")
        .all();
      expect(images.length).toBeGreaterThan(0);
      for (const image of images) {
        const { slot, rendered } = await sizesSlot(image);
        expect(slot, `${path} @${width}px`).toBeGreaterThanOrEqual(
          rendered - 1,
        );
      }
    }
  });
}
