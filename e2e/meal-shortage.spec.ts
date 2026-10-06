import { expect, test } from "@playwright/test";
import { expectServedPool, mealCandidates } from "./meal-fixtures";

// 跑在預設的 chromium 專案：現有固定菜譜的候選池本來就不足四菜一湯，
// 剛好用來驗證「候選不足」。若日後固定菜譜增補到足夠，前提檢查會先失敗並指出原因。
const pool = mealCandidates("tests/fixtures/recipes");

test.beforeAll(async ({ playwright }, testInfo) => {
  const request = await playwright.request.newContext({
    baseURL: testInfo.project.use.baseURL,
  });
  await expectServedPool(request, pool);
  await request.dispose();
});

test("候選不足時說明原因，不產生不完整的套餐", async ({ page }) => {
  expect(
    pool.filter((item) => !item.soup).length,
    "前提：固定菜譜的非湯候選必須少於四道",
  ).toBeLessThan(4);

  expect(
    pool.filter((item) => item.soup).length,
    "前提：固定菜譜至少要有一道湯，才能把不足歸因於非湯菜",
  ).toBeGreaterThanOrEqual(1);

  await page.goto("/meal/");
  await page.getByRole("button", { name: "重新抽選" }).click();
  await expect(page.getByRole("status")).toContainText("候選池的非湯菜不足");
  await expect(
    page.getByRole("list", { name: "本桌菜色" }).getByRole("listitem"),
  ).toHaveCount(0);

  await page.getByRole("button", { name: "五菜一湯" }).click();
  await expect(page.getByRole("status")).toContainText("候選池的非湯菜不足");
});
