import { expect, test } from "@playwright/test";

test("首頁列出固定資料菜譜、不列草稿，並能點進菜譜頁", async ({ page }) => {
  await page.goto("/");
  const link = page
    .getByRole("region", { name: "菜譜清單" })
    .getByRole("link", { name: "番茄炒蛋" });
  await expect(link).toBeVisible();
  await expect(page.getByText("草稿範例")).toHaveCount(0);

  await link.click();
  await expect(page).toHaveURL(/\/recipes\/tomato-egg\/$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "番茄炒蛋" }),
  ).toBeVisible();
  await expect(
    page.getByRole("listitem").filter({ hasText: "番茄" }).first(),
  ).toBeVisible();
  await expect(page.locator("ol li").first()).toBeVisible();
  await expect(
    page.getByRole("contentinfo").getByText(/站主審閱，未經試做/),
  ).toBeVisible();
});

test("草稿菜譜網址在正式建置回 404", async ({ page }) => {
  const response = await page.goto("/recipes/draft-sample/");
  expect(response?.status()).toBe(404);
});
