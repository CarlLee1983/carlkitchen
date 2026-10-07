import { expect, test, type Page } from "@playwright/test";
import { expectServedPool, mealCandidates } from "./meal-fixtures";
import { MEAL_STORAGE_KEY } from "../src/utils/meal-session";
import {
  WIDTHS,
  expectFocusRing,
  expectNoAxeViolations,
  expectNoHorizontalScroll,
  expectNoOverflowNow,
  expectTouchTargets,
  tabTo,
} from "./a11y-helpers";

// 這支規格跑在 meal 專案：以 tests/fixtures/meal-recipes 建置，
// 候選池剛好是 5 道非湯菜（一道蔬菜菜加四道蛋白質菜）與 1 道湯。
const pool = mealCandidates("tests/fixtures/meal-recipes");
const dishes = pool.filter((item) => !item.soup);
const soups = pool.filter((item) => item.soup);
const vegetableDish = dishes.find((item) => item.vegetable)!;
const dishTitles = dishes.map((item) => item.title);

const items = (page: Page) =>
  page.getByRole("list", { name: "本桌菜色" }).getByRole("listitem");
const itemOf = (page: Page, title: string) =>
  items(page).filter({ has: page.getByRole("link", { name: title }) });
const status = (page: Page) => page.getByRole("status");
const reroll = (page: Page) => page.getByRole("button", { name: "重新抽選" });
const modeButton = (page: Page, label: "四菜一湯" | "五菜一湯") =>
  page
    .getByRole("group", { name: "菜數" })
    .getByRole("button", { name: label });
const lockOf = (page: Page, title: string) =>
  page.getByRole("button", { name: `鎖定 ${title}` });
const replaceOf = (page: Page, title: string) =>
  page.getByRole("button", { name: `替換 ${title}` });

const titlesOnTable = async (page: Page) =>
  (await items(page).getByRole("link").allTextContents()).map((text) =>
    text.trim(),
  );

test.beforeAll(async ({ playwright }, testInfo) => {
  const request = await playwright.request.newContext({
    baseURL: testInfo.project.use.baseURL,
  });
  await expectServedPool(request, pool);
  await request.dispose();

  // 測試資料的前提：換掉任何一道都無從補位，才能構成原型的「替換無解」。
  expect(dishes).toHaveLength(5);
  expect(soups).toHaveLength(1);
  expect(dishes.filter((item) => item.vegetable)).toHaveLength(1);
});

test("尚未抽選時顯示提示，按下重新抽選得到四菜一湯並連到菜譜頁", async ({
  page,
}) => {
  await page.goto("/meal/");
  await expect(
    page.getByRole("heading", { level: 1, name: "配一桌菜" }),
  ).toBeVisible();
  await expect(items(page)).toHaveCount(0);
  await expect(page.getByText("尚未抽選")).toBeVisible();
  await expect(modeButton(page, "四菜一湯")).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await reroll(page).click();
  await expect(items(page)).toHaveCount(5);
  const titles = await titlesOnTable(page);
  // 只出現配菜候選：非候選與草稿都不會被抽到。
  for (const title of titles) {
    expect(pool.map((item) => item.title)).toContain(title);
  }
  expect(new Set(titles).size).toBe(5);
  expect(titles).toContain(soups[0]!.title);
  expect(titles).toContain(vegetableDish.title);
  for (const item of pool) {
    const link = page.getByRole("link", { name: item.title });
    if ((await link.count()) > 0) {
      await expect(link).toHaveAttribute("href", `/recipes/${item.id}/`);
    }
  }

  await page.getByRole("link", { name: vegetableDish.title }).click();
  await expect(page).toHaveURL(`/recipes/${vegetableDish.id}/`);
});

test("固定菜譜中的主食不會被抽中", async ({ page }) => {
  // 候選池層的防線由 tests/meal-planner.test.ts 的單元測試守住；這裡只驗證端到端的結果。
  // 前提：固定菜譜確實有這道已發布的主食
  await page.goto("/recipes/meal-noodles/");
  await expect(
    page.getByRole("heading", { level: 1, name: "台式炒麵" }),
  ).toBeVisible();
  await page.goto("/meal/");
  for (const label of ["四菜一湯", "五菜一湯"] as const) {
    await modeButton(page, label).click();
    for (let i = 0; i < 10; i++) {
      await reroll(page).click();
      await expect(items(page).first()).toBeVisible();
      expect(await titlesOnTable(page)).not.toContain("台式炒麵");
    }
  }
});

test("全頁只有一個朗讀區，訊息只出現在其中", async ({ page }) => {
  await page.goto("/meal/");
  await expect(status(page)).toHaveCount(1);
  await reroll(page).click();
  await expect(status(page)).toHaveCount(1);
  await expect(status(page)).not.toBeEmpty();
});

test("切換五菜一湯用掉全部候選，再切回四菜一湯", async ({ page }) => {
  await page.goto("/meal/");
  await modeButton(page, "五菜一湯").click();
  await expect(modeButton(page, "五菜一湯")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(items(page)).toHaveCount(6);
  expect((await titlesOnTable(page)).sort()).toEqual(
    [...dishTitles, soups[0]!.title].sort(),
  );

  await modeButton(page, "四菜一湯").click();
  await expect(items(page)).toHaveCount(5);
});

test.describe("替換無解", () => {
  test("沒有備選時套餐不變並說明原因", async ({ page }) => {
    await page.goto("/meal/");
    await reroll(page).click();
    const before = await titlesOnTable(page);

    // 唯一的湯沒有其他可換。
    await replaceOf(page, soups[0]!.title).click();
    await expect(status(page)).toContainText("沒有其他可替換的湯");
    expect(await titlesOnTable(page)).toEqual(before);

    // 唯一的蔬菜菜換成蛋白質菜會失去平衡，所以也無解。
    await replaceOf(page, vegetableDish.title).click();
    await expect(status(page)).toContainText("符合平衡規則的替換菜色");
    expect(await titlesOnTable(page)).toEqual(before);

    // 蛋白質菜可以換成沒被抽到的那一道，其餘位置不動。
    const swapped = before.find(
      (title) => dishTitles.includes(title) && title !== vegetableDish.title,
    )!;
    await replaceOf(page, swapped).click();
    await expect(status(page)).toContainText("只替換了一道菜");
    const after = await titlesOnTable(page);
    expect(after).not.toContain(swapped);
    expect(after).toContain(vegetableDish.title);
    expect(after.filter((title) => before.includes(title))).toHaveLength(4);
  });

  test("五菜一湯已用盡候選，任何一道都換不了", async ({ page }) => {
    await page.goto("/meal/");
    await modeButton(page, "五菜一湯").click();
    const before = await titlesOnTable(page);
    await replaceOf(page, dishes[0]!.title).click();
    await expect(status(page)).toContainText("沒有不重複且符合平衡規則");
    expect(await titlesOnTable(page)).toEqual(before);
  });
});

test.describe("鎖定衝突", () => {
  test("鎖住五道菜後切回四菜，提示先解鎖且套餐不變", async ({ page }) => {
    await page.goto("/meal/");
    await modeButton(page, "五菜一湯").click();
    for (const title of dishTitles) {
      await lockOf(page, title).click();
      await expect(lockOf(page, title)).toHaveAttribute("aria-pressed", "true");
      // 鎖定不只靠顏色：菜位標籤有可見文字。
      await expect(itemOf(page, title).getByText("已鎖定")).toBeVisible();
    }
    const before = await titlesOnTable(page);

    await modeButton(page, "四菜一湯").click();
    await expect(status(page)).toContainText("先解鎖");
    await expect(modeButton(page, "五菜一湯")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(await titlesOnTable(page)).toEqual(before);

    // 已鎖定的菜不能替換。
    await replaceOf(page, dishTitles[0]!).click();
    await expect(status(page)).toContainText("先解鎖");

    // 解鎖一道後可以切回四菜，其餘鎖定保留。
    await lockOf(page, dishTitles[4]!).click();
    await expect(lockOf(page, dishTitles[4]!)).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await modeButton(page, "四菜一湯").click();
    await expect(items(page)).toHaveCount(5);
    for (const title of dishTitles.slice(0, 4)) {
      await expect(lockOf(page, title)).toHaveAttribute("aria-pressed", "true");
    }
  });
});

test.describe("同分頁重整", () => {
  test("重整後還原套餐、模式與鎖定；新分頁重新開始", async ({
    page,
    context,
  }) => {
    await page.goto("/meal/");
    await modeButton(page, "五菜一湯").click();
    await lockOf(page, vegetableDish.title).click();
    await lockOf(page, soups[0]!.title).click();
    const before = await titlesOnTable(page);

    await page.reload();
    await expect(lockOf(page, soups[0]!.title)).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(await titlesOnTable(page)).toEqual(before);
    await expect(modeButton(page, "五菜一湯")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(lockOf(page, vegetableDish.title)).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    const other = await context.newPage();
    await other.goto("/meal/");
    await expect(items(other)).toHaveCount(0);
    await expect(other.getByText("尚未抽選")).toBeVisible();
  });
});

test.describe("失效套餐", () => {
  test("保存的菜譜不在候選池時清除並請讀者重抽", async ({ page }) => {
    await page.goto("/meal/");
    const stale = {
      mode: 4,
      dishes: [
        { id: "no-longer-published", locked: true },
        ...dishes.slice(1, 4).map((item) => ({ id: item.id, locked: false })),
      ],
      soup: { id: soups[0]!.id, locked: false },
      seed: 1,
    };
    await page.evaluate(
      ([key, value]) => sessionStorage.setItem(key!, value!),
      [MEAL_STORAGE_KEY, JSON.stringify(stale)],
    );

    await page.reload();
    await expect(items(page)).toHaveCount(0);
    await expect(status(page)).toContainText("已失效");
    await expect(status(page)).toContainText("請重新抽選");
    expect(
      await page.evaluate(
        (key) => sessionStorage.getItem(key),
        MEAL_STORAGE_KEY,
      ),
    ).toBeNull();

    // 清除後可以正常重抽。
    await reroll(page).click();
    await expect(items(page)).toHaveCount(5);
  });
});

test("保存的內容損毀時同樣清除並提示重抽", async ({ page }) => {
  await page.goto("/meal/");
  await page.evaluate(
    (key) => sessionStorage.setItem(key, "{壞掉"),
    MEAL_STORAGE_KEY,
  );
  await page.reload();
  await expect(items(page)).toHaveCount(0);
  await expect(status(page)).toContainText("已失效");
  await expect(status(page)).toContainText("請重新抽選");
});

test.describe("無障礙", () => {
  test("模式切換、重抽、鎖定與替換按鈕在各寬度觸控目標至少 44×44", async ({
    page,
  }) => {
    await page.goto("/meal/");
    await reroll(page).click();
    await expect(items(page)).toHaveCount(5);
    await expectTouchTargets(page, page.getByRole("button"));
  });

  test("只用鍵盤即可抽選與鎖定（Tab 抵達，空白鍵啟動）", async ({ page }) => {
    await page.goto("/meal/");
    await tabTo(page, reroll(page));
    await page.keyboard.press("Enter");
    await expect(items(page)).toHaveCount(5);

    const lock = lockOf(page, vegetableDish.title);
    await tabTo(page, lock);
    await expectFocusRing(lock);
    await page.keyboard.press("Space");
    // 重新繪製後焦點仍在同一顆按鈕上，可以連續操作。
    await expect(lock).toBeFocused();
    await expect(lock).toHaveAttribute("aria-pressed", "true");
    await expectFocusRing(lock);
  });

  test("替換後焦點仍在同一位置的替換按鈕", async ({ page }) => {
    await page.goto("/meal/");
    await reroll(page).click();
    const before = await titlesOnTable(page);
    const swapped = before.find(
      (title) => dishTitles.includes(title) && title !== vegetableDish.title,
    )!;
    const index = before.indexOf(swapped);

    await replaceOf(page, swapped).click();
    await expect(status(page)).toContainText("只替換了一道菜");
    expect((await titlesOnTable(page))[index]).not.toBe(swapped);
    await expect(
      items(page)
        .nth(index)
        .getByRole("button", { name: /^替換 / }),
    ).toBeFocused();
  });

  test("只用鍵盤即可替換，焦點可見", async ({ page }) => {
    await page.goto("/meal/");
    // 完全以 Tab 與 Enter 操作：先走到重新抽選
    await tabTo(page, reroll(page));
    await page.keyboard.press("Enter");
    await expect(items(page)).toHaveCount(5);

    const before = await titlesOnTable(page);
    const swapped = before.find(
      (title) => dishTitles.includes(title) && title !== vegetableDish.title,
    )!;
    const button = replaceOf(page, swapped);
    await tabTo(page, button);
    await expectFocusRing(button);
    await page.keyboard.press("Enter");
    await expect(status(page)).toContainText("只替換了一道菜");
  });

  test("配菜頁在各寬度沒有水平捲動，含已抽選狀態", async ({ page }) => {
    await expectNoHorizontalScroll(page, "/meal/");
    await reroll(page).click();
    await expect(items(page)).toHaveCount(5);
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      await expectNoOverflowNow(page, `已抽選 ${width}px`);
    }
  });

  test("axe 零違規：未抽選、已抽選（含鎖定）與五菜一湯", async ({ page }) => {
    await page.goto("/meal/");
    await expectNoAxeViolations(page, "配菜頁未抽選");
    await reroll(page).click();
    await expect(items(page)).toHaveCount(5);
    await lockOf(page, vegetableDish.title).click();
    await expectNoAxeViolations(page, "配菜頁已抽選");

    await modeButton(page, "五菜一湯").click();
    await expect(modeButton(page, "五菜一湯")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(items(page)).toHaveCount(6);
    await expectNoAxeViolations(page, "配菜頁五菜一湯");
  });
});
