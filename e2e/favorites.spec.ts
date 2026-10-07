import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, expectTouchTargets } from "./a11y-helpers";

const recipe = "/recipes/tomato-egg/";
const favorites = "/favorites/";

test("收藏菜譜會保留在本機，清單可連回菜譜並移除", async ({ page }) => {
  await page.goto(recipe);
  const save = page.getByRole("button", { name: "收藏這道菜" });
  await expect(save).toHaveAttribute("aria-pressed", "false");
  await save.click();
  await expect(save).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("已收藏", { exact: true })).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "收藏這道菜" }),
  ).toHaveAttribute("aria-pressed", "true");

  await page
    .getByRole("navigation", { name: "主選單" })
    .getByRole("link", { name: "我的收藏" })
    .click();
  await expect(page).toHaveURL(/\/favorites\/$/);
  await expect(page.getByRole("link", { name: "番茄炒蛋" })).toHaveAttribute(
    "href",
    recipe,
  );
  await expect(page.getByRole("status")).toContainText("1 道");
  await page.getByRole("button", { name: "移除收藏：番茄炒蛋" }).click();
  await expect(page.getByRole("link", { name: "番茄炒蛋" })).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText("還沒有收藏");
  await page.goto(recipe);
  await expect(
    page.getByRole("button", { name: "收藏這道菜" }),
  ).toHaveAttribute("aria-pressed", "false");
});

test("只顯示本站已發布菜譜，舊識別值與草稿不出現在收藏清單", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "carlkitchen:favorites:v1",
      JSON.stringify(["no-longer-published", "draft-sample", "tomato-egg"]),
    );
  });
  await page.goto(favorites);
  await expect(page.getByRole("link", { name: "番茄炒蛋" })).toBeVisible();
  await expect(page.getByRole("main")).not.toContainText("草稿範例");
  await expect(page.getByRole("main")).not.toContainText("no-longer-published");
  await expect(page.getByRole("status")).toContainText("1 道");
});

test("未啟用 JavaScript 時不顯示無法操作的收藏按鈕", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(recipe);
  await expect(page.getByRole("button", { name: "收藏這道菜" })).toHaveCount(0);
  await page.goto(favorites);
  expect(await page.evaluate(() => document.body.innerText)).toContain(
    "需要啟用 JavaScript 才能查看本機收藏。",
  );
  await context.close();
});

test("瀏覽器禁止儲存時給出提示，不假裝收藏成功", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new Error("blocked");
    };
  });
  await page.goto(recipe);
  await page.getByRole("button", { name: "收藏這道菜" }).click();
  await expect(
    page.getByRole("button", { name: "收藏這道菜" }),
  ).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("alert")).toHaveText(
    "無法儲存收藏，請檢查瀏覽器儲存設定。",
  );
});

test("收藏頁的互動有鍵盤焦點、足夠觸控面積且無無障礙違規", async ({ page }) => {
  await page.goto(recipe);
  const save = page.locator("[data-favorite-id]");
  await save.focus();
  await expect(save).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(save).toHaveAttribute("aria-pressed", "true");
  await expectTouchTargets(page, save);
  await expectNoAxeViolations(page, "菜譜收藏狀態");
  await page.goto(favorites);
  await expectTouchTargets(
    page,
    page.getByRole("button", { name: "移除收藏：番茄炒蛋" }),
  );
  await expectNoAxeViolations(page, "我的收藏");
});
