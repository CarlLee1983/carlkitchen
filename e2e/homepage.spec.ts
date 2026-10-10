import { expect, test, type Page } from "@playwright/test";
import { expectFocusRing, expectTouchTargets } from "./a11y-helpers";
import { fixtureKindLabels, publishedFixtureRecipes } from "./fixture-recipes";
import { sizesSlot } from "./image-helpers";

const recipes = publishedFixtureRecipes();
const soups = recipes.filter((recipe) => recipe.category === "湯");
const staples = recipes.filter((recipe) => recipe.category === "主食");
const vegetables = recipes.filter((recipe) =>
  recipe.dishKinds.includes("vegetable"),
);
const eggBeans = recipes.filter((recipe) =>
  recipe.dishKinds.includes("egg-bean"),
);
const meats = recipes.filter((recipe) => recipe.dishKinds.includes("meat"));
const seafood = recipes.filter((recipe) =>
  recipe.dishKinds.includes("seafood"),
);

const list = (page: Page) => page.getByRole("region", { name: "菜譜清單" });
const rows = (page: Page) => list(page).getByRole("listitem");
const hero = (page: Page) =>
  page.getByRole("region", { name: "隨機看看一道菜" }).getByRole("link");
// 全頁只有一個會朗讀的 status（搜尋框下方的筆數提示），避免重複朗讀。
const count = (page: Page) => page.getByRole("status");

test("第一屏有日期、標題、搜尋框與配菜入口", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "煮奔" }),
  ).toBeVisible();
  await expect(
    page.getByText(/\d{1,2} 月 \d{1,2} 日　週[日一二三四五六]/),
  ).toBeVisible();
  await expect(page.getByRole("search").getByRole("searchbox")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "配一桌四菜一湯" }),
  ).toHaveAttribute("href", "/meal/");
});

test("清單依菜名排序，每列有縮圖、菜名、摘要與分類標籤，草稿不出現", async ({
  page,
}) => {
  await page.goto("/");
  await expect(rows(page)).toHaveCount(recipes.length);
  for (const [i, recipe] of recipes.entries()) {
    const row = rows(page).nth(i);
    await expect(
      row.getByRole("heading", { name: recipe.title }),
    ).toBeVisible();
    await expect(row.getByText(recipe.summary)).toBeVisible();
    await expect(
      row.getByText(fixtureKindLabels(recipe).join("・"), { exact: true }),
    ).toBeVisible();
    await expect(row.getByRole("img")).toBeVisible();
    await expect(row.getByRole("link", { name: recipe.title })).toHaveAttribute(
      "href",
      `/recipes/${recipe.id}/`,
    );
  }
  await expect(page.getByText("草稿範例")).toHaveCount(0);
});

test("篩選列依序為全部、蔬菜、肉類、海鮮、蛋豆、主食、湯，沒有非湯料理選項（固定菜譜有主食）", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("group", { name: "篩選" }).getByRole("button"),
  ).toHaveText(["全部", "蔬菜", "肉類", "海鮮", "蛋豆", "主食", "湯"]);
});

test("篩選即時更新清單、顯示筆數並寫進網址；選回全部移除參數", async ({
  page,
}) => {
  await page.goto("/");
  await expect(count(page)).toContainText(String(recipes.length));

  await page.getByRole("button", { name: "湯", exact: true }).click();
  await expect(rows(page)).toHaveCount(soups.length);
  await expect(count(page)).toContainText(String(soups.length));
  await expect(page).toHaveURL(/[?&]kind=soup(&|$)/);
  for (const [i, soup] of soups.entries()) {
    await expect(rows(page).nth(i)).toContainText(soup.title);
  }

  await page.getByRole("button", { name: "蔬菜" }).click();
  await expect(rows(page)).toHaveCount(vegetables.length);
  await expect(count(page)).toContainText(String(vegetables.length));
  await expect(page).toHaveURL(/[?&]kind=vegetable(&|$)/);

  await page.getByRole("button", { name: "蛋豆" }).click();
  await expect(rows(page)).toHaveCount(eggBeans.length);
  await expect(page).toHaveURL(/[?&]kind=egg-bean(&|$)/);

  await page.getByRole("button", { name: "主食" }).click();
  await expect(rows(page)).toHaveCount(staples.length);
  await expect(page).toHaveURL(/[?&]kind=staple(&|$)/);
  for (const [i, staple] of staples.entries()) {
    await expect(rows(page).nth(i)).toContainText(staple.title);
    await expect(
      rows(page).nth(i).getByText("主食", { exact: true }),
    ).toBeVisible();
  }

  await page.getByRole("button", { name: "全部" }).click();
  await expect(rows(page)).toHaveCount(recipes.length);
  await expect(page).not.toHaveURL(/kind=/);
});

test("主食不出現在四種非湯分類與湯之下，菜譜頁標示主食", async ({ page }) => {
  expect(staples.length).toBeGreaterThan(0);
  await page.goto("/");
  for (const name of ["蔬菜", "肉類", "海鮮", "蛋豆", "湯"]) {
    await page.getByRole("button", { name, exact: true }).click();
    for (const staple of staples) {
      await expect(rows(page).filter({ hasText: staple.title })).toHaveCount(0);
    }
  }
  await page.goto(`/recipes/${staples[0]!.id}/`);
  await expect(page.getByText("主食", { exact: true })).toBeVisible();
});

test("真正雙主角的菜同時出現在蔬菜與蛋豆之下", async ({ page }) => {
  const both = recipes.filter(
    (recipe) =>
      recipe.dishKinds.includes("vegetable") &&
      recipe.dishKinds.includes("egg-bean"),
  );
  expect(both.length).toBeGreaterThan(0);
  await page.goto("/");
  const filters = [
    { name: "蔬菜", kind: "vegetable", expected: vegetables },
    { name: "蛋豆", kind: "egg-bean", expected: eggBeans },
  ];
  for (const { name, kind, expected } of filters) {
    await page.getByRole("button", { name }).click();
    await expect(page).toHaveURL(new RegExp(`[?&]kind=${kind}(&|$)`));
    await expect(rows(page)).toHaveCount(expected.length);
    for (const recipe of both) {
      await expect(
        rows(page).filter({ hasText: recipe.title }).first(),
      ).toBeVisible();
    }
  }
});

test("開啟帶 kind 參數的網址會還原篩選與按鈕狀態；重新整理仍在", async ({
  page,
}) => {
  await page.goto("/?kind=soup");
  await expect(rows(page)).toHaveCount(soups.length);
  await expect(
    page.getByRole("button", { name: "湯", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "全部" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await page.reload();
  await expect(rows(page)).toHaveCount(soups.length);
});

test("無法辨識的 kind 與舊的 category 參數視為全部", async ({ page }) => {
  for (const query of [
    "kind=nonsense",
    "category=soup",
    "kind=non-soup",
    "kind=protein",
  ]) {
    await page.goto(`/?${query}`);
    await expect(rows(page)).toHaveCount(recipes.length);
    await expect(page.getByRole("button", { name: "全部" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  }
});

test("成品大圖連到存在的已發布菜譜，顯示的圖與菜名屬於所連菜譜，且不同亂數會推薦不同菜譜", async ({
  page,
}) => {
  const hrefs = new Set<string>();
  for (const value of [0, 0.999]) {
    await page.addInitScript((v) => {
      Math.random = () => v;
    }, value);
    await page.goto("/");
    await expect(hero(page)).toBeVisible();
    await expect(hero(page)).not.toContainText("AI 繪製插畫");
    const href = (await hero(page).getAttribute("href"))!;
    const target = recipes.find((recipe) => href === `/recipes/${recipe.id}/`);
    expect(target).toBeDefined();
    await expect(hero(page).getByRole("img")).toHaveAttribute(
      "alt",
      target!.heroAlt,
    );
    await expect(hero(page)).toContainText(target!.title);
    hrefs.add(href);
  }
  expect(hrefs.size).toBe(Math.min(2, recipes.length));
});

test("成品大圖明確標示為隨機展示", async ({ page }) => {
  await page.goto("/");
  const region = page.getByRole("region", { name: "隨機看看一道菜" });
  await expect(region).toBeVisible();
  await expect(region.getByText("隨機看看一道菜")).toBeVisible();
  await expect(region).not.toContainText("今日主廚推薦");
});

test("手機分類篩選時收起大圖，清除後恢復", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/");
  await expect(hero(page)).toBeVisible();

  await page.getByRole("button", { name: "湯", exact: true }).click();
  await expect(hero(page)).toBeHidden();
  await expect(rows(page)).toHaveCount(soups.length);
  await expect(page).toHaveURL(/[?&]kind=soup(&|$)/);

  await page.reload();
  await expect(hero(page)).toBeHidden();
  await page.getByRole("button", { name: "全部" }).click();
  await expect(hero(page)).toBeVisible();
});

test("寬螢幕分類篩選時保留左文右圖，大圖換成該類的菜", async ({ page }) => {
  const hrefsOf = (list: typeof recipes) =>
    list.map((recipe) => `/recipes/${recipe.id}/`);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto("/");

  for (const [name, members] of [
    ["湯", soups],
    ["肉類", meats],
    ["海鮮", seafood],
    ["蛋豆", eggBeans],
    ["蔬菜", vegetables],
    ["主食", staples],
  ] as const) {
    await page.getByRole("button", { name, exact: true }).click();
    await expect(rows(page)).toHaveCount(members.length);
    await expect(hero(page)).toBeVisible();
    expect(hrefsOf(members)).toContain(await hero(page).getAttribute("href"));
    const search = (await page.getByRole("searchbox").boundingBox())!;
    expect((await hero(page).boundingBox())!.x).toBeGreaterThan(
      search.x + search.width,
    );
  }

  // 回到全部時沿用目前這道，不再換圖
  const staple = await hero(page).getAttribute("href");
  await page.getByRole("button", { name: "全部" }).click();
  await expect(hero(page)).toHaveAttribute("href", staple!);

  // 網址帶分類直接開啟時，大圖屬於該類（只驗結果，不驗是否先閃過別道再換）
  await page.goto("/?kind=soup");
  expect(hrefsOf(soups)).toContain(await hero(page).getAttribute("href"));

  // 有搜尋字詞時收起圖片欄、搜尋框撐開；清掉字詞後大圖回來，仍屬於該類
  await page.getByRole("searchbox").fill(soups[0]!.title);
  await expect(rows(page)).toHaveCount(1);
  await expect(hero(page)).toBeHidden();
  const searchWidth = (await page.getByRole("searchbox").boundingBox())!.width;
  const mainWidth = (await page.locator("main").boundingBox())!.width;
  expect(searchWidth).toBeGreaterThan(mainWidth * 0.75);
  await page.getByRole("searchbox").fill("");
  await expect(hero(page)).toBeVisible();
  expect(hrefsOf(soups)).toContain(await hero(page).getAttribute("href"));
});

test("窄螢幕篩選後放寬到左文右圖，大圖換成該類的菜", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.addInitScript(() => {
    Math.random = () => 0;
  });
  await page.goto("/");
  await page.getByRole("button", { name: "湯", exact: true }).click();
  await expect(hero(page)).toBeHidden();
  await page.setViewportSize({ width: 1366, height: 900 });
  await expect(hero(page)).toBeVisible();
  // CSS 先讓大圖出現，media query 的 change 事件稍後才換圖，所以用會重試的斷言
  await expect(hero(page)).toHaveAttribute(
    "href",
    new RegExp(`^/recipes/(${soups.map((recipe) => recipe.id).join("|")})/$`),
  );
});

test("成品大圖與縮圖的載入設定：大圖優先載入，縮圖不下載超大尺寸", async ({
  page,
}) => {
  await page.goto("/");
  const img = hero(page).getByRole("img");
  await expect(img).toHaveAttribute("fetchpriority", "high");
  await expect(img).not.toHaveAttribute("loading", "lazy");
  const thumb = rows(page).first().getByRole("img");
  const srcset = (await thumb.getAttribute("srcset"))!;
  const widths = [...srcset.matchAll(/\s(\d+)w/g)].map((m) => Number(m[1]));
  expect(Math.max(...widths)).toBeLessThanOrEqual(400);
});

for (const width of [390, 1366]) {
  test(`成品大圖的 sizes 與實際顯示寬度一致（視窗 ${width}px），瀏覽器不會挑過大的圖`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const { slot, rendered } = await sizesSlot(hero(page).getByRole("img"));
    expect(Math.abs(slot - rendered)).toBeLessThanOrEqual(1);
  });
}

test("關閉 JS 時只有一張大圖（第一道菜），不會下載全部", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  const imageRequests: string[] = [];
  page.on("request", (request) => {
    if (request.resourceType() === "image") imageRequests.push(request.url());
  });
  await page.goto("/");
  await expect(hero(page)).toHaveCount(1);
  await expect(hero(page)).toHaveAttribute(
    "href",
    `/recipes/${recipes[0]!.id}/`,
  );
  await expect(hero(page).getByRole("img")).toBeVisible();
  await page.waitForLoadState("load");
  // 只計 Astro 處理的菜譜圖片，排除頁首 Logo；大圖一張，清單縮圖每列一張（可能延遲載入）。
  const heroSrc = await hero(page).getByRole("img").getAttribute("src");
  expect(
    imageRequests.filter((url) => new URL(url).pathname.startsWith("/_astro/"))
      .length,
  ).toBeLessThanOrEqual(recipes.length + 1);
  expect(heroSrc).toBeTruthy();
  await context.close();
});

test("點成品大圖進入該菜譜頁", async ({ page }) => {
  await page.goto("/");
  const href = (await hero(page).getAttribute("href"))!;
  const target = recipes.find((recipe) => href === `/recipes/${recipe.id}/`)!;
  await hero(page).click();
  await expect(page).toHaveURL(new RegExp(`${href}$`));
  await expect(
    page.getByRole("heading", { level: 1, name: target.title }),
  ).toBeVisible();
});

test("無法辨識的 kind 載入時從網址清掉", async ({ page }) => {
  await page.goto("/?kind=nonsense");
  await expect(page).not.toHaveURL(/kind=/);
  await expect(hero(page)).toBeVisible();
});

test("上一頁會依網址還原篩選（hash 導航後選篩選再返回）", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "主選單" })
    .getByRole("link", { name: "菜譜" })
    .click();
  await expect(page).toHaveURL(/\/#recipes$/);
  await page.getByRole("button", { name: "湯", exact: true }).click();
  await expect(rows(page)).toHaveCount(soups.length);
  await page.goBack();
  await expect(page).not.toHaveURL(/kind=/);
  await expect(rows(page)).toHaveCount(recipes.length);
  await expect(hero(page)).toBeVisible();
  await expect(page.getByRole("button", { name: "全部" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("導覽列「菜譜」連到首頁清單", async ({ page }) => {
  await page.goto("/recipes/tomato-egg/");
  await page
    .getByRole("navigation", { name: "主選單" })
    .getByRole("link", { name: "菜譜" })
    .click();
  await expect(page).toHaveURL(/\/#.+$/);
  await expect(
    list(page).getByRole("heading", { level: 2, name: "菜譜清單" }),
  ).toBeInViewport();
});

test("手機導覽到菜譜清單時標題不被固定篩選列遮住", async ({ page }) => {
  // 短視窗可讓錨點捲到頂端，避免測試資料較少時被頁尾的最大捲動量掩蓋。
  for (const width of [360, 390, 430]) {
    await page.setViewportSize({ width, height: 400 });
    await page.goto("/recipes/tomato-egg/");
    await page.getByRole("button", { name: "選單" }).click();
    await page
      .getByRole("navigation", { name: "主選單" })
      .getByRole("link", { name: "菜譜" })
      .click();
    const filterBox = await page
      .getByRole("group", { name: "篩選" })
      .boundingBox();
    const headingBox = await list(page)
      .getByRole("heading", { level: 2, name: "菜譜清單" })
      .boundingBox();
    expect(headingBox!.y).toBeGreaterThanOrEqual(
      filterBox!.y + filterBox!.height,
    );
  }
});

test("手機只保留導覽列的配菜入口，較寬畫面保留搜尋區入口", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const toggleBtn = page.getByRole("button", { name: "選單" });
  await expect(toggleBtn).toBeVisible();
  const introLink = page.getByRole("link", { name: "配一桌四菜一湯" });
  await expect(introLink).toBeHidden();

  for (const width of [640, 1023, 1366]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(introLink).toBeVisible();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await toggleBtn.click();
  const navLink = page
    .getByRole("navigation", { name: "主選單" })
    .getByRole("link", { name: "四菜一湯" });
  await navLink.click();
  await expect(page).toHaveURL(/\/meal\/$/);
});

test("手機搜尋、專題、篩選與菜譜連結可依畫面順序用鍵盤操作", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  // 固定在節氣列會顯示的日期：節氣列是連到總覽頁的連結，位在專題與篩選之間。
  await page.clock.setFixedTime(new Date("2026-10-10T12:00:00+08:00"));
  await page.goto("/");
  const search = page.getByRole("searchbox");
  const firstFilter = page
    .getByRole("group", { name: "篩選" })
    .getByRole("button")
    .first();
  const firstRecipe = rows(page).first().getByRole("link");
  await search.focus();
  await expect(search).toBeFocused();
  await page.keyboard.press("Tab");
  const featured = page
    .getByRole("region", { name: "本期專題" })
    .getByRole("link");
  await expect(featured).toBeFocused();
  await expectFocusRing(featured);
  await page.keyboard.press("Tab");
  const term = page
    .getByRole("region", { name: "這個時節" })
    .locator("[data-solar-term]");
  await expect(term).toBeFocused();
  await expectFocusRing(term);
  await page.keyboard.press("Tab");
  await expect(firstFilter).toBeFocused();
  await expectFocusRing(firstFilter);
  for (let i = 0; i < 10; i++) {
    if (await firstRecipe.evaluate((el) => el === document.activeElement))
      break;
    await page.keyboard.press("Tab");
  }
  await expect(firstRecipe).toBeFocused();
  await expectFocusRing(firstRecipe, "::after");
});

test("寬螢幕第一屏左文右圖", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto("/");
  const search = await page.getByRole("searchbox").boundingBox();
  const heroBox = await hero(page).boundingBox();
  expect(heroBox!.x).toBeGreaterThan(search!.x + search!.width);
});

test("互動元件在各寬度觸控目標至少 44×44", async ({ page }) => {
  await page.goto("/");
  await expectTouchTargets(
    page,
    page
      .getByRole("searchbox")
      .or(page.getByRole("link", { name: "配一桌四菜一湯" }))
      .or(page.getByRole("button")),
  );
});

test("鍵盤 Tab 可走到清單第一列菜名，焦點外框可見", async ({ page }) => {
  await page.goto("/");
  const firstLink = rows(page).first().getByRole("link");
  // 寬版的隨機推薦在清單之前（固定菜譜 5 張卡片），Tab 停點比原本多。
  for (let i = 0; i < 30; i++) {
    if (await firstLink.evaluate((el) => el === document.activeElement)) break;
    await page.keyboard.press("Tab");
  }
  await expect(firstLink).toBeFocused();
  // 焦點外框畫在撐滿整列的 ::after 上
  await expectFocusRing(firstLink, "::after");
});

test("鍵盤可用 Enter 切換篩選", async ({ page }) => {
  await page.goto("/");
  const button = page.getByRole("button", { name: "湯", exact: true });
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(rows(page)).toHaveCount(soups.length);
  await expectFocusRing(button);
});

for (const width of [320, 360, 390, 430]) {
  test(`七類篩選在 ${width}px 手機寬度無溢出且每個目標可觸控`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    const filters = page.getByRole("group", { name: "篩選" });
    const buttons = filters.getByRole("button");
    await expect(buttons).toHaveText([
      "全部",
      "蔬菜",
      "肉類",
      "海鮮",
      "蛋豆",
      "主食",
      "湯",
    ]);
    for (const button of await buttons.all()) {
      const rect = (await button.boundingBox())!;
      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.x + rect.width).toBeLessThanOrEqual(width);
      expect(rect.width).toBeGreaterThanOrEqual(44);
      expect(rect.height).toBeGreaterThanOrEqual(44);
      await button.click();
      await expect(button).toHaveAttribute("aria-pressed", "true");
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
  });
}

test("每道菜的菜譜頁分類與清單一致，審核理由不進公開 HTML", async ({
  page,
}) => {
  for (const recipe of recipes) {
    const response = await page.goto(`/recipes/${recipe.id}/`);
    await expect(page.locator(".recipe-meta")).toContainText(
      fixtureKindLabels(recipe).join("・"),
    );
    expect(await response!.text()).not.toContain(recipe.classificationReason);
  }
});

test("舊 protein 網址退回全部並正規化，不暗中改成肉類", async ({ page }) => {
  await page.goto("/?kind=protein&foo=keep");
  await expect(rows(page)).toHaveCount(recipes.length);
  await expect(page.getByRole("button", { name: "全部" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page).not.toHaveURL(/kind=/);
  await expect(page).toHaveURL(/foo=keep/);
});
