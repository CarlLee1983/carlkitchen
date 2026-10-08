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
// 候選池剛好是 5 道非湯菜（一道蔬菜加四道肉蛋料理）與 1 道湯。
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
const chooseSelf = (page: Page) =>
  page.getByRole("button", { name: "從空白自選" });
const modeButton = (page: Page, label: "四菜一湯" | "五菜一湯") =>
  page
    .getByRole("group", { name: "菜數" })
    .getByRole("button", { name: label });
const lockOf = (page: Page, title: string) =>
  page.getByRole("button", { name: `鎖定 ${title}` });
const replaceOf = (page: Page, title: string) =>
  page.getByRole("button", { name: `替換 ${title}` });
const chooseOf = (page: Page, index: number) =>
  items(page)
    .nth(index)
    .getByRole("combobox", { name: /指定菜色/ });
const searchOf = (page: Page, index: number) =>
  items(page)
    .nth(index)
    .getByRole("searchbox", { name: /搜尋菜色/ });

const titlesOnTable = async (page: Page) =>
  (await items(page).getByRole("link").allTextContents()).map((text) =>
    text.trim(),
  );
const sharedFour =
  "v1.4.meal-beef,meal-cabbage,meal-chicken,meal-fish.meal-radish-soup";
const sharedFive =
  "v1.5.meal-beef,meal-cabbage,meal-chicken,meal-fish,meal-tofu.meal-radish-soup";

test("完成自選後複製連結，另一個全新瀏覽器可依原順序查看菜譜並繼續編輯", async ({
  page,
  browser,
}) => {
  await page.goto("/meal/");
  await chooseSelf(page).click();
  const order = ["meal-beef", "meal-cabbage", "meal-chicken", "meal-fish"];
  for (const [index, id] of order.entries()) {
    await chooseOf(page, index).selectOption(id);
  }
  await items(page)
    .last()
    .getByRole("combobox", { name: /指定湯/ })
    .selectOption(soups[0]!.id);
  await expect(status(page)).toContainText("自選菜單已完成");
  await expect(page).toHaveURL(/\/meal\/\?menu=v1\.4\./);
  const original = await titlesOnTable(page);
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          (window as Window & { __copied?: string }).__copied = value;
        },
      },
    });
  });
  await page.getByRole("button", { name: "複製菜單連結" }).click();
  const copied = await page.evaluate(
    () => (window as Window & { __copied?: string }).__copied,
  );
  expect(copied).toBe(page.url());
  const recipient = await browser.newContext();
  try {
    const received = await recipient.newPage();
    await received.goto(copied!);
    expect(await titlesOnTable(received)).toEqual(original);
    await expect(items(received).getByRole("link")).toHaveCount(5);
    for (const link of await items(received).getByRole("link").all()) {
      await expect(link).toHaveAttribute("href", /\/recipes\//);
    }
    await expect(
      received.getByRole("button", { name: "複製菜單連結" }),
    ).toBeEnabled();
    await chooseOf(received, 0).selectOption("meal-tofu");
    await expect(
      items(received).first().getByRole("link", { name: "香煎豆腐" }),
    ).toBeVisible();
    expect(new URL(received.url()).searchParams.get("menu")).toContain(
      "meal-tofu,meal-cabbage",
    );
  } finally {
    await recipient.close();
  }
});

test("分享網址優先於分頁舊菜單；無效網址顯示原因且不回退私人菜單", async ({
  page,
}) => {
  await page.goto("/meal/");
  await reroll(page).click();
  const oldSaved = await page.evaluate(
    (key) => sessionStorage.getItem(key),
    MEAL_STORAGE_KEY,
  );
  await page.goto(`/meal/?menu=${sharedFive}`);
  await expect(modeButton(page, "五菜一湯")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(await titlesOnTable(page)).toEqual([
    "青椒牛肉",
    "蒜炒高麗菜",
    "香煎雞腿",
    "清蒸魚",
    "香煎豆腐",
    "蘿蔔湯",
  ]);
  await expect(lockOf(page, dishes[0]!.title)).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  const sharedSaved = await page.evaluate(
    (key) => sessionStorage.getItem(key),
    MEAL_STORAGE_KEY,
  );
  await page.goto("/meal/?menu=v2.4.bad");
  await expect(items(page)).toHaveCount(0);
  await expect(status(page)).toContainText("不支援這個版本");
  await expect(
    page.getByRole("button", { name: "複製菜單連結" }),
  ).toBeDisabled();
  expect(sharedSaved).not.toBe(oldSaved);
  expect(
    await page.evaluate((key) => sessionStorage.getItem(key), MEAL_STORAGE_KEY),
  ).toBe(sharedSaved);
  await page.goto(`/meal/?menu=${sharedFour}&menu=${sharedFive}`);
  await expect(items(page)).toHaveCount(0);
  await expect(status(page)).toContainText("多個 menu 參數");
});

test("編輯只取代目前網址並保留其他參數；重整保留新菜色與鎖定", async ({
  page,
}) => {
  await page.goto("/");
  await page.goto(`/meal/?source=friend&menu=${sharedFour}#today`);
  const original = await titlesOnTable(page);
  await lockOf(page, original[1]!).click();
  await page.reload();
  await expect(lockOf(page, original[1]!)).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await chooseOf(page, 0).selectOption("meal-tofu");
  const updated = await titlesOnTable(page);
  expect(updated[0]).toBe("香煎豆腐");
  const editedUrl = new URL(page.url());
  expect(editedUrl.searchParams.get("source")).toBe("friend");
  expect(editedUrl.hash).toBe("#today");
  expect(editedUrl.searchParams.getAll("menu")).toEqual([
    "v1.4.meal-tofu,meal-cabbage,meal-chicken,meal-fish.meal-radish-soup",
  ]);
  await page.reload();
  expect(await titlesOnTable(page)).toEqual(updated);
  await expect(lockOf(page, original[1]!)).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const savedBeforeFailure = await page.evaluate(
    (key) => sessionStorage.getItem(key),
    MEAL_STORAGE_KEY,
  );
  await replaceOf(page, soups[0]!.title).click();
  await expect(status(page)).toContainText("沒有其他可替換的湯");
  expect(page.url()).toBe(editedUrl.href);
  expect(
    await page.evaluate((key) => sessionStorage.getItem(key), MEAL_STORAGE_KEY),
  ).toBe(savedBeforeFailure);
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await page.goForward();
  expect(await titlesOnTable(page)).toEqual(updated);
  await expect(lockOf(page, original[1]!)).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

test("進入草稿移除舊菜單參數，取消和失敗操作維持網址與保存內容", async ({
  page,
}) => {
  await page.goto(`/meal/?source=friend&menu=${sharedFour}#today`);
  const initialSaved = await page.evaluate(
    (key) => sessionStorage.getItem(key),
    MEAL_STORAGE_KEY,
  );
  page.once("dialog", (dialog) => dialog.dismiss());
  await chooseSelf(page).click();
  expect(new URL(page.url()).searchParams.get("menu")).toBe(sharedFour);
  expect(
    await page.evaluate((key) => sessionStorage.getItem(key), MEAL_STORAGE_KEY),
  ).toBe(initialSaved);
  page.once("dialog", (dialog) => dialog.accept());
  await chooseSelf(page).click();
  const draftUrl = new URL(page.url());
  expect(draftUrl.searchParams.has("menu")).toBe(false);
  expect(draftUrl.searchParams.get("source")).toBe("friend");
  expect(draftUrl.hash).toBe("#today");
  await chooseOf(page, 0).selectOption("meal-beef");
  await page.reload();
  await expect(
    items(page).first().getByRole("link", { name: "青椒牛肉" }),
  ).toBeVisible();
  await expect(items(page).nth(1).getByText("尚未指定")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "複製菜單連結" }),
  ).toBeDisabled();
});

test("同一連結重新導覽會解鎖；複製與原生分享失敗會朗讀提示", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async () => {
        throw new Error("blocked");
      },
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error("blocked");
        },
      },
    });
  });
  await page.goto(`/meal/?menu=${sharedFour}`);
  await lockOf(page, "青椒牛肉").click();
  await page.goto(`/meal/?menu=${sharedFour}`);
  await expect(lockOf(page, "青椒牛肉")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await page.getByRole("button", { name: "複製菜單連結" }).click();
  await expect(status(page)).toContainText("無法複製");
  await page.getByRole("button", { name: "分享菜單", exact: true }).click();
  await expect(status(page)).toContainText("無法分享");
  await expectNoOverflowNow(page, "分享菜單手機版");
  await expectNoAxeViolations(page, "分享菜單手機版");
});

test("原生分享使用只有菜單參數的連結", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (data: ShareData) => {
        (window as Window & { __shared?: ShareData }).__shared = data;
      },
    });
  });
  await page.goto(`/meal/?source=friend&menu=${sharedFour}#today`);
  await page.getByRole("button", { name: "分享菜單", exact: true }).click();
  await expect(status(page)).toContainText("已分享菜單連結");
  const data = await page.evaluate(
    () => (window as Window & { __shared?: ShareData }).__shared,
  );
  expect(data?.title).toBe("配一桌菜");
  expect(new URL(data!.url!).search).toBe(
    `?menu=${encodeURIComponent(sharedFour)}`,
  );
  expect(new URL(data!.url!).hash).toBe("");
});

test("分頁儲存被阻擋時，未抽選仍可重抽並從網址還原", async ({ page }) => {
  await page.goto("/meal/");
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new Error("storage blocked");
    };
  });
  await reroll(page).click();
  await expect(items(page).getByRole("link")).toHaveCount(5);
  const before = await titlesOnTable(page);
  expect(new URL(page.url()).searchParams.get("menu")).toMatch(/^v1\.4\./);
  await expect(status(page)).toContainText("無法保存分頁狀態");
  await page.reload();
  expect(await titlesOnTable(page)).toEqual(before);
});

test("分頁儲存被阻擋時，分享菜單仍可指定且重整保留新網址", async ({ page }) => {
  await page.goto(`/meal/?menu=${sharedFour}`);
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new Error("storage blocked");
    };
  });
  const urlBeforeLock = page.url();
  await lockOf(page, "蒜炒高麗菜").click();
  await expect(lockOf(page, "蒜炒高麗菜")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(page.url()).toBe(urlBeforeLock);
  await expect(status(page)).toContainText("無法保存分頁狀態");
  await chooseOf(page, 0).selectOption("meal-tofu");
  await expect(
    items(page).first().getByRole("link", { name: "香煎豆腐" }),
  ).toBeVisible();
  await expect(lockOf(page, "蒜炒高麗菜")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(status(page)).toContainText("無法保存分頁狀態");
  const updated = page.url();
  expect(new URL(updated).searchParams.get("menu")).toContain("meal-tofu");
  await page.reload();
  expect(page.url()).toBe(updated);
  await expect(
    items(page).first().getByRole("link", { name: "香煎豆腐" }),
  ).toBeVisible();
  await expect(lockOf(page, "蒜炒高麗菜")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

test("分頁儲存被阻擋時，草稿不會在重整後回到舊完整菜單", async ({ page }) => {
  await page.goto(`/meal/?menu=${sharedFour}`);
  const oldSaved = await page.evaluate(
    (key) => sessionStorage.getItem(key),
    MEAL_STORAGE_KEY,
  );
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new Error("storage blocked");
    };
  });
  page.once("dialog", (dialog) => dialog.accept());
  await chooseSelf(page).click();
  expect(new URL(page.url()).searchParams.has("menu")).toBe(false);
  await expect(items(page)).toHaveCount(5);
  await expect(items(page).getByRole("link")).toHaveCount(0);
  await chooseOf(page, 0).selectOption("meal-beef");
  await expect(
    items(page).first().getByRole("link", { name: "青椒牛肉" }),
  ).toBeVisible();
  expect(
    await page.evaluate((key) => sessionStorage.getItem(key), MEAL_STORAGE_KEY),
  ).toBe(oldSaved);
  await expect(status(page)).toContainText("無法保存分頁狀態");
  await page.reload();
  await expect(items(page)).toHaveCount(5);
  await expect(
    items(page).first().getByRole("link", { name: "青椒牛肉" }),
  ).toBeVisible();
  await expect(items(page).getByRole("link")).toHaveCount(1);
});

test("網址取代失敗時，指定菜色回復分頁保存且保留可見菜單", async ({ page }) => {
  await page.goto(`/meal/?menu=${sharedFour}`);
  const before = await titlesOnTable(page);
  const oldUrl = page.url();
  const oldSaved = await page.evaluate(
    (key) => sessionStorage.getItem(key),
    MEAL_STORAGE_KEY,
  );
  await page.evaluate(() => {
    history.replaceState = () => {
      throw new Error("history blocked");
    };
  });
  await chooseOf(page, 0).selectOption("meal-tofu");
  expect(page.url()).toBe(oldUrl);
  expect(await titlesOnTable(page)).toEqual(before);
  expect(
    await page.evaluate((key) => sessionStorage.getItem(key), MEAL_STORAGE_KEY),
  ).toBe(oldSaved);
  await expect(status(page)).toContainText("無法儲存這次變更");
});

test("自選菜名搜尋只顯示當前菜位可用候選，清除後能指定結果", async ({
  page,
}) => {
  await page.goto("/meal/");
  await chooseSelf(page).click();
  await searchOf(page, 0).fill("牛肉");
  await expect(status(page)).toContainText("找到 1 道菜色");
  await expect(
    chooseOf(page, 0).getByRole("option", { name: "青椒牛肉" }),
  ).toHaveCount(1);
  await chooseOf(page, 0).selectOption("meal-beef");
  await expect(
    items(page).first().getByRole("link", { name: "青椒牛肉" }),
  ).toBeVisible();

  await searchOf(page, 1).fill("牛肉");
  await expect(status(page)).toContainText("找不到可選菜色");
  await expect(
    chooseOf(page, 1).getByRole("option", { name: "青椒牛肉" }),
  ).toHaveCount(0);
  await searchOf(page, 1).fill("");
  await expect(status(page)).toContainText("可選 4 道菜色");
  await expect(
    chooseOf(page, 1).getByRole("option", { name: "蒜炒高麗菜" }),
  ).toHaveCount(1);
  await expect(
    chooseOf(page, 1).getByRole("option", { name: "青椒牛肉" }),
  ).toHaveCount(0);
  await expect(
    chooseOf(page, 1).getByRole("option", { name: "台式炒麵" }),
  ).toHaveCount(0);
  await expect(
    chooseOf(page, 1).getByRole("option", { name: "涼拌小黃瓜" }),
  ).toHaveCount(0);
  await searchOf(page, 1).fill("蒜炒");
  await chooseOf(page, 1).selectOption("meal-cabbage");
  await expect(
    items(page).nth(1).getByRole("link", { name: "蒜炒高麗菜" }),
  ).toBeVisible();

  const soupSearch = items(page)
    .last()
    .getByRole("searchbox", { name: /搜尋湯/ });
  await soupSearch.fill("草稿");
  await expect(status(page)).toContainText("找不到可選湯");
  await soupSearch.fill("蘿蔔");
  await expect(
    items(page)
      .last()
      .getByRole("combobox", { name: /指定湯/ })
      .getByRole("option", { name: "蘿蔔湯" }),
  ).toHaveCount(1);
});

test("自選搜尋可用鍵盤完成，手機上不溢出並有可讀提示", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/meal/");
  await chooseSelf(page).click();
  const search = searchOf(page, 0);
  await tabTo(page, search);
  await expectFocusRing(search);
  await page.keyboard.type("牛肉");
  await expect(search).toHaveValue("牛肉");
  await expect(status(page)).toContainText("找到 1 道菜色");
  await expect(search).toHaveAttribute("aria-describedby", "meal-search-0");
  await expect(items(page).first().locator("#meal-search-0")).toContainText(
    "找到 1 道菜色",
  );
  await page.keyboard.press("Enter");
  await expect(
    items(page).first().getByRole("link", { name: "青椒牛肉" }),
  ).toBeVisible();
  await expectNoOverflowNow(page, "自選搜尋手機版");
  await expectNoAxeViolations(page, "自選搜尋後");
});

test("自選完成後搜尋仍在且保留焦點，可排除重複並替換菜色", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/meal/");
  await chooseSelf(page).click();
  await chooseOf(page, 0).selectOption("meal-beef");
  await chooseOf(page, 1).selectOption("meal-cabbage");
  await chooseOf(page, 2).selectOption("meal-chicken");
  await items(page)
    .last()
    .getByRole("combobox", { name: /指定湯/ })
    .selectOption(soups[0]!.id);
  await searchOf(page, 3).fill("清蒸");
  await searchOf(page, 3).press("Enter");
  await expect(status(page)).toContainText("自選菜單已完成");
  await expect(searchOf(page, 3)).toBeFocused();
  await expect(searchOf(page, 0)).toBeVisible();

  await searchOf(page, 1).fill("牛肉");
  await expect(status(page)).toContainText("找不到可選菜色");
  await expect(
    chooseOf(page, 1).getByRole("option", { name: "青椒牛肉" }),
  ).toHaveCount(0);
  await searchOf(page, 1).fill("");
  await expect(status(page)).toContainText("可選 1 道菜色");
  await expect(chooseOf(page, 1).getByRole("option")).toHaveText([
    "蒜炒高麗菜",
  ]);
  await searchOf(page, 0).fill("豆腐");
  await expect(
    chooseOf(page, 0).getByRole("option", { name: "香煎豆腐" }),
  ).toHaveCount(1);
  await searchOf(page, 0).press("Enter");
  await expect(
    items(page).first().getByRole("link", { name: "香煎豆腐" }),
  ).toBeVisible();
  await expect(
    items(page).nth(1).getByRole("link", { name: "蒜炒高麗菜" }),
  ).toBeVisible();
  await expectNoOverflowNow(page, "完成菜單搜尋手機版");
});

test("抽選出的完整菜單也能依菜名搜尋並指定備選", async ({ page }) => {
  await page.goto("/meal/");
  await reroll(page).click();
  const before = await titlesOnTable(page);
  const missing = dishes.find((item) => !before.includes(item.title))!;
  const index = before.findIndex(
    (title) => title !== vegetableDish.title && title !== soups[0]!.title,
  );
  await searchOf(page, index).fill(missing.title);
  await expect(status(page)).toContainText("找到 1 道菜色");
  await expect(
    chooseOf(page, index).getByRole("option", { name: missing.title }),
  ).toHaveCount(1);
  await searchOf(page, index).press("Enter");
  await expect(
    items(page).nth(index).getByRole("link", { name: missing.title }),
  ).toBeVisible();
  await expect(searchOf(page, index)).toBeFocused();
  await expect(status(page)).toContainText("只指定了一道菜");
});

test("空白自選可任意順序填滿四菜一湯，完成後仍可鎖定與開啟菜譜", async ({
  page,
}) => {
  await page.goto("/meal/");
  await chooseSelf(page).click();
  await expect(items(page)).toHaveCount(5);
  await expect(status(page)).toContainText("還缺 4 道非湯料理");
  await chooseOf(page, 2).selectOption(vegetableDish.id);
  await expect(
    items(page).nth(2).getByRole("link", { name: vegetableDish.title }),
  ).toBeVisible();
  await expect(items(page).nth(0).getByRole("link")).toHaveCount(0);
  await items(page)
    .last()
    .getByRole("combobox", { name: /指定湯/ })
    .selectOption(soups[0]!.id);
  const meat = dishes.filter((item) => item.id !== vegetableDish.id);
  for (const [index, item] of [
    [3, meat[0]!],
    [0, meat[1]!],
    [1, meat[2]!],
  ] as const) {
    await chooseOf(page, index).selectOption(item.id);
  }
  await expect(status(page)).toContainText("自選菜單已完成");
  await expect(items(page).getByRole("link")).toHaveCount(5);
  await lockOf(page, vegetableDish.title).click();
  await expect(lockOf(page, vegetableDish.title)).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await chooseOf(page, 3).selectOption(meat[3]!.id);
  await expect(
    items(page).nth(3).getByRole("link", { name: meat[3]!.title }),
  ).toBeVisible();
  await page.getByRole("link", { name: vegetableDish.title }).click();
  await expect(page).toHaveURL(`/recipes/${vegetableDish.id}/`);
});

test("完成的自選菜單切換菜數前確認，取消後保留原菜色與模式", async ({
  page,
}) => {
  await page.goto("/meal/");
  await chooseSelf(page).click();
  for (const [index, item] of dishes.slice(0, 4).entries()) {
    await chooseOf(page, index).selectOption(item.id);
  }
  await items(page)
    .last()
    .getByRole("combobox", { name: /指定湯/ })
    .selectOption(soups[0]!.id);
  await expect(status(page)).toContainText("自選菜單已完成");
  const before = await titlesOnTable(page);

  page.once("dialog", (dialog) => dialog.dismiss());
  await modeButton(page, "五菜一湯").click();
  await expect(modeButton(page, "四菜一湯")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(await titlesOnTable(page)).toEqual(before);

  page.once("dialog", (dialog) => dialog.accept());
  await modeButton(page, "五菜一湯").click();
  await expect(items(page)).toHaveCount(6);
});

test("五菜草稿切回四菜前提示可能丟失的第五道，手機鍵盤可選菜", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/meal/");
  await chooseSelf(page).click();
  await modeButton(page, "五菜一湯").click();
  await expect(items(page)).toHaveCount(6);
  await tabTo(page, chooseOf(page, 4));
  await expectFocusRing(chooseOf(page, 4));
  await chooseOf(page, 4).selectOption(vegetableDish.id);
  page.once("dialog", (dialog) => dialog.dismiss());
  await modeButton(page, "四菜一湯").click();
  await expect(items(page)).toHaveCount(6);
  await expect(
    items(page).nth(4).getByRole("link", { name: vegetableDish.title }),
  ).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await modeButton(page, "四菜一湯").click();
  await expect(items(page)).toHaveCount(5);
  await modeButton(page, "五菜一湯").click();
  for (const [index, item] of dishes.entries()) {
    await chooseOf(page, index).selectOption(item.id);
  }
  await items(page)
    .last()
    .getByRole("combobox", { name: /指定湯/ })
    .selectOption(soups[0]!.id);
  await expect(status(page)).toContainText("自選菜單已完成");
  await expect(items(page).getByRole("link")).toHaveCount(6);
  await expectNoOverflowNow(page, "自選菜單手機版");
});

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
    if (label === "五菜一湯") page.once("dialog", (dialog) => dialog.accept());
    await modeButton(page, label).click();
    for (let i = 0; i < 10; i++) {
      await reroll(page).click();
      await expect(items(page).first()).toBeVisible();
      expect(await titlesOnTable(page)).not.toContain("台式炒麵");
    }
  }
});

test("從菜位選擇候選只替換該位置；不列重複菜色且鎖定會拒絕", async ({
  page,
}) => {
  await page.goto("/meal/");
  await reroll(page).click();
  const before = await titlesOnTable(page);
  const missing = dishes.find((item) => !before.includes(item.title))!;
  const index = before.findIndex(
    (title) => title !== vegetableDish.title && title !== soups[0]!.title,
  );
  const chooser = chooseOf(page, index);
  const options = await chooser.getByRole("option").allTextContents();
  expect(options.sort()).toEqual([before[index], missing.title].sort());
  expect(options).not.toContain("台式炒麵");
  await chooser.focus();
  await chooser.selectOption(missing.id);
  await expect(status(page)).toContainText("只指定了一道菜");
  await expect(chooseOf(page, index)).toBeFocused();
  const after = await titlesOnTable(page);
  expect(after[index]).toBe(missing.title);
  expect(after.filter((title, i) => i !== index)).toEqual(
    before.filter((title, i) => i !== index),
  );

  await expect(
    chooseOf(page, index).getByRole("option", { name: vegetableDish.title }),
  ).toHaveCount(0);
  expect(await titlesOnTable(page)).toEqual(after);
  await lockOf(page, missing.title).click();
  await chooseOf(page, index).selectOption(
    dishes.find((item) => item.title === before[index])!.id,
  );
  await expect(status(page)).toContainText("先解鎖");
  expect(await titlesOnTable(page)).toEqual(after);
});

test("完整菜單的唯一蔬菜只列平衡替換，草稿仍可暫選肉蛋料理", async ({
  page,
}) => {
  await page.goto("/meal/");
  await reroll(page).click();
  const vegetableIndex = (await titlesOnTable(page)).indexOf(
    vegetableDish.title,
  );
  const chooser = chooseOf(page, vegetableIndex);
  await expect(chooser.getByRole("option")).toHaveText([vegetableDish.title]);
  await searchOf(page, vegetableIndex).fill("牛肉");
  await expect(status(page)).toContainText("找不到可選菜色");
  await expect(chooser.getByRole("option", { name: "青椒牛肉" })).toHaveCount(
    0,
  );
  await searchOf(page, vegetableIndex).fill("");
  await expect(status(page)).toContainText("可選 1 道菜色");
  await expect(
    chooser.getByRole("option", { name: vegetableDish.title }),
  ).toHaveCount(1);

  page.once("dialog", (dialog) => dialog.accept());
  await chooseSelf(page).click();
  await chooseOf(page, vegetableIndex).selectOption("meal-beef");
  await expect(
    items(page).nth(vegetableIndex).getByRole("link", { name: "青椒牛肉" }),
  ).toBeVisible();
  await expect(status(page)).toContainText("還缺蔬菜");
});

test("湯位只列湯；手機上可用鍵盤抵達指定欄位並保留焦點", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/meal/");
  await reroll(page).click();
  const soupChooser = items(page)
    .last()
    .getByRole("combobox", { name: /指定湯/ });
  await expect(soupChooser.getByRole("option")).toHaveCount(1);
  await expect(soupChooser.getByRole("option")).toHaveText(soups[0]!.title);
  await expect(soupChooser.getByRole("option", { name: "草稿湯" })).toHaveCount(
    0,
  );
  const before = await titlesOnTable(page);
  const missing = dishes.find((item) => !before.includes(item.title))!;
  const index = before.findIndex(
    (title) => title !== vegetableDish.title && title !== soups[0]!.title,
  );
  await tabTo(page, chooseOf(page, index));
  await expectFocusRing(chooseOf(page, index));
  await chooseOf(page, index).selectOption(missing.id);
  await expect(chooseOf(page, index)).toHaveValue(missing.id);
  await expect(status(page)).toContainText("只指定了一道菜");
  await expect(chooseOf(page, index)).toBeFocused();
  const after = await titlesOnTable(page);
  expect(after[index]).toBe(missing.title);
  expect(after.filter((title, slotIndex) => slotIndex !== index)).toEqual(
    before.filter((title, slotIndex) => slotIndex !== index),
  );
  await expectNoOverflowNow(page, "指定菜色手機版");
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

  page.once("dialog", (dialog) => dialog.accept());
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

    // 唯一的蔬菜換成肉蛋料理會失去平衡，所以也無解。
    await replaceOf(page, vegetableDish.title).click();
    await expect(status(page)).toContainText("符合平衡規則的替換菜色");
    expect(await titlesOnTable(page)).toEqual(before);

    // 肉蛋料理可以換成沒被抽到的那一道，其餘位置不動。
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

    page.once("dialog", (dialog) => dialog.accept());
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
    page.once("dialog", (dialog) => dialog.accept());
    await modeButton(page, "四菜一湯").click();
    await expect(items(page)).toHaveCount(5);
    for (const title of dishTitles.slice(0, 4)) {
      await expect(lockOf(page, title)).toHaveAttribute("aria-pressed", "true");
    }
  });
});

test.describe("同分頁重整", () => {
  test("草稿重抽成功後保存完整套餐", async ({ page }) => {
    await page.goto("/meal/");
    await chooseSelf(page).click();
    await chooseOf(page, 1).selectOption(vegetableDish.id);
    page.once("dialog", (dialog) => dialog.accept());
    await reroll(page).click();
    await expect(items(page).getByRole("link")).toHaveCount(5);
    const before = await titlesOnTable(page);
    await page.reload();
    expect(await titlesOnTable(page)).toEqual(before);
  });

  test("未完成自選草稿重整後保留模式、空位及指定位置", async ({ page }) => {
    const meat = dishes.find((item) => item.id !== vegetableDish.id)!;
    await page.goto("/meal/");
    await chooseSelf(page).click();
    await modeButton(page, "五菜一湯").click();
    await chooseOf(page, 1).selectOption(meat.id);
    await chooseOf(page, 4).selectOption(vegetableDish.id);
    await page.reload();
    await expect(modeButton(page, "五菜一湯")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(items(page)).toHaveCount(6);
    await expect(items(page).nth(0).getByText("尚未指定")).toBeVisible();
    await expect(
      items(page).nth(1).getByRole("link", { name: meat.title }),
    ).toBeVisible();
    await expect(
      items(page).nth(4).getByRole("link", { name: vegetableDish.title }),
    ).toBeVisible();
    await expect(items(page).last().getByText("尚未指定")).toBeVisible();
    await expect(status(page)).toContainText("還缺 3 道非湯料理");
  });

  test("全空自選草稿重整後仍顯示固定空位", async ({ page }) => {
    await page.goto("/meal/");
    await chooseSelf(page).click();
    await page.reload();
    await expect(items(page)).toHaveCount(5);
    await expect(status(page)).toContainText("還缺 4 道非湯料理");
  });

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
  test("下架菜色的草稿清除並提示失效，不顯示其他已選菜色", async ({ page }) => {
    await page.goto("/meal/");
    const stale = {
      kind: "draft",
      draft: {
        mode: 4,
        dishes: [
          { id: "no-longer-published", locked: false },
          { id: dishes[1]!.id, locked: false },
          null,
          null,
        ],
        soup: null,
        seed: 1,
      },
    };
    await page.evaluate(
      ([key, value]) => sessionStorage.setItem(key!, value!),
      [MEAL_STORAGE_KEY, JSON.stringify(stale)],
    );
    await page.reload();
    await expect(items(page)).toHaveCount(0);
    await expect(status(page)).toContainText("已失效");
    expect(
      await page.evaluate(
        (key) => sessionStorage.getItem(key),
        MEAL_STORAGE_KEY,
      ),
    ).toBeNull();
  });

  test("失去蔬菜搭配的完整套餐清除並提示重抽", async ({ page }) => {
    await page.goto("/meal/");
    const stale = {
      mode: 4,
      dishes: dishes
        .filter((item) => !item.vegetable)
        .slice(0, 4)
        .map((item) => ({ id: item.id, locked: false })),
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
    await reroll(page).click();
    await expect(items(page)).toHaveCount(5);
  });

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

    page.once("dialog", (dialog) => dialog.accept());
    await modeButton(page, "五菜一湯").click();
    await expect(modeButton(page, "五菜一湯")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(items(page)).toHaveCount(6);
    await expectNoAxeViolations(page, "配菜頁五菜一湯");
  });
});

for (const width of [320, 390, 768, 1280]) {
  test(`菜單欄位在 ${width}px 保持可讀寬度、單行標籤與自然縮圖比例`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/meal/?menu=${sharedFour}`);
    for (const item of await items(page).all()) {
      const search = item.getByRole("searchbox");
      const chooser = item.getByRole("combobox");
      for (const control of [search, chooser]) {
        const box = await control.boundingBox();
        expect(box!.width).toBeGreaterThanOrEqual(200);
        expect(box!.height).toBeGreaterThanOrEqual(44);
        const label = await control.evaluate((element) => {
          const node = element.closest("label")!.firstChild!;
          const range = document.createRange();
          range.selectNodeContents(node);
          const box = range.getBoundingClientRect();
          const lineHeight = parseFloat(
            getComputedStyle(element.closest("label")!).lineHeight,
          );
          return { height: box.height, lineHeight };
        });
        expect(label.height).toBeLessThanOrEqual(label.lineHeight + 1);
      }
      const searchBox = (await search.boundingBox())!;
      const chooserBox = (await chooser.boundingBox())!;
      if (width <= 390) {
        const rowBox = (await item.boundingBox())!;
        expect(chooserBox.y).toBeGreaterThanOrEqual(
          searchBox.y + searchBox.height,
        );
        expect(chooserBox.width).toBeCloseTo(rowBox.width, 0);
      } else {
        expect(chooserBox.y).toBeCloseTo(searchBox.y, 0);
        expect(chooserBox.x).toBeGreaterThanOrEqual(
          searchBox.x + searchBox.width,
        );
      }
      const lockBox = (await item
        .getByRole("button", { name: /^鎖定 / })
        .boundingBox())!;
      expect(lockBox.y).toBeGreaterThanOrEqual(
        chooserBox.y + chooserBox.height,
      );
      const textFits = await chooser.evaluate((element) => {
        const select = element as HTMLSelectElement;
        const style = getComputedStyle(select);
        const context = document.createElement("canvas").getContext("2d")!;
        context.font = `${style.fontSize} ${style.fontFamily}`;
        const longest = Math.max(
          ...Array.from(
            select.options,
            (option) => context.measureText(option.text).width,
          ),
        );
        return (
          longest +
            parseFloat(style.paddingLeft) +
            parseFloat(style.paddingRight) +
            24 <=
          select.clientWidth
        );
      });
      expect(textFits, "菜名與選單箭頭有足夠顯示空間").toBe(true);
      const image = await item.getByRole("img").boundingBox();
      expect(image!.width / image!.height).toBeCloseTo(1.5, 1);
    }
    await expectNoOverflowNow(page, `欄位可讀 ${width}px`);
    page.once("dialog", (dialog) => dialog.accept());
    await chooseSelf(page).click();
    const blankSelect = await chooseOf(page, 0).boundingBox();
    expect(blankSelect!.width).toBeGreaterThanOrEqual(200);
    await searchOf(page, 0).fill("沒有這道菜");
    await expect(items(page).first()).toContainText("找不到可選菜色");
    await expectNoOverflowNow(page, `無搜尋結果 ${width}px`);
  });
}
