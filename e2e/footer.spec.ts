import { expect, test } from "@playwright/test";

// 頁尾放在共用版型，首頁、菜譜頁與 404 頁都要有。
for (const path of ["/", "/recipes/tomato-egg/", "/recipes/draft-sample/"]) {
  test(`${path} 有頁尾聲明、關於頁連結與版權`, async ({ page }) => {
    await page.goto(path);
    const footer = page.getByRole("contentinfo");
    await expect(footer).toContainText(
      "菜譜整理自公開資料、經站主審閱，份量與時間僅供參考。",
    );
    await expect(footer).not.toContainText(/AI|試做/);
    await expect(
      footer.getByRole("link", { name: "了解更多" }),
    ).toHaveAttribute("href", "/about/");
    await expect(footer).toContainText(/© 2026(–\d{4})? 煮奔/);
  });
}
