import { expect, test } from "@playwright/test";
import { expectFocusRing, expectTouchTargets, tabTo } from "./a11y-helpers";

test("菜譜只反向連到已發布且關聯自己的食材條目", async ({ page }) => {
  await page.goto("/recipes/tomato-egg/");
  const guide = page.getByRole("region", { name: "了解食材" });
  await expect(guide.getByRole("link")).toHaveText([
    "高麗菜",
    "番茄",
    "蒜頭",
    "醬油",
  ]);
  await expect(page.getByRole("link", { name: "草稿食材" })).toHaveCount(0);
  await guide.getByRole("link", { name: "番茄" }).click();
  await expect(page).toHaveURL(/\/ingredients\/tomato\/$/);
  await page.getByRole("link", { name: /番茄炒蛋/ }).click();
  await expect(page).toHaveURL(/\/recipes\/tomato-egg\/$/);

  await page.goto("/recipes/egg-drop-soup/");
  await expect(page.getByRole("region", { name: "了解食材" })).toHaveCount(0);
});

test("手機與鍵盤可由菜譜前往食材介紹", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/recipes/tomato-egg/");
  const guide = page.getByRole("region", { name: "了解食材" });
  await expectTouchTargets(page, guide.getByRole("link"));
  await page.setViewportSize({ width: 390, height: 844 });
  const link = guide.getByRole("link", { name: "番茄" });
  await tabTo(page, link);
  await expectFocusRing(link);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/ingredients\/tomato\/$/);
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
});

test("Pagefind 建置索引只含菜譜，食材結果不混入搜尋與分享網址", async ({
  page,
}) => {
  await page.goto("/?q=固定資料辛香料條目");
  const indexedUrls = await page.evaluate(async () => {
    const pagefind = (await import(String("/pagefind/pagefind.js"))) as {
      search: (query: string) => Promise<{
        results: { data: () => Promise<{ url: string }> }[];
      }>;
    };
    const results = await Promise.all([
      pagefind.search("蒜頭"),
      pagefind.search("固定資料辛香料條目"),
    ]);
    return Promise.all(
      results.flatMap((result) => result.results.map((item) => item.data())),
    ).then((pages) => pages.map((item) => item.url));
  });
  expect(indexedUrls.length).toBeGreaterThan(0);
  expect(indexedUrls.every((url) => url.startsWith("/recipes/"))).toBe(true);
  expect(indexedUrls.some((url) => url.startsWith("/ingredients/"))).toBe(
    false,
  );
  await expect(page.getByRole("searchbox")).toHaveValue("固定資料辛香料條目");
  await expect(
    page.getByRole("region", { name: "菜譜清單" }).getByRole("listitem"),
  ).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("searchbox")).toHaveValue("固定資料辛香料條目");
});
