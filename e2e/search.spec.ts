import { expect, test, type Page } from "@playwright/test";
import {
  draftFixtureRecipes,
  publishedFixtureRecipes,
  type FixtureRecipe,
} from "./fixture-recipes";

const recipes = publishedFixtureRecipes();
const drafts = draftFixtureRecipes();
const soups = recipes.filter((recipe) => recipe.category === "湯");

const list = (page: Page) => page.getByRole("region", { name: "菜譜清單" });
const rows = (page: Page) => list(page).getByRole("listitem");
const rowOf = (page: Page, recipe: FixtureRecipe) =>
  rows(page).filter({
    has: page.getByRole("link", { name: recipe.title, exact: true }),
  });
const box = (page: Page) => page.getByRole("searchbox");
const hero = (page: Page) =>
  page.getByRole("region", { name: "隨機推薦菜譜" }).getByRole("link");
const status = (page: Page) => page.getByRole("status");
const emptyMessage = (page: Page) => page.getByText("找不到符合");

/**
 * 輸入字詞並等到結果真的套用才返回：狀態列在清單更新後才寫入「「字詞」符合 N 道」
 * （無字詞時「共 N 道」），所以等它出現就不會在舊狀態上誤過。
 */
async function search(page: Page, q: string) {
  await box(page).fill(q);
  const term = q.trim();
  await expect(status(page), `等待搜尋「${term}」套用`).toContainText(
    term ? `「${term}」符合` : "共",
  );
}

/** 目前可見的菜名，依畫面順序。 */
async function titles(page: Page) {
  return rows(page).getByRole("heading").allTextContents();
}

// 只出現在步驟、用量單位、替代文字或小提醒的詞；下面第一個測試會驗證它們確實
// 不在任何可搜尋欄位，所以「查不到」是索引範圍造成的，不是詞本來就不存在。
const EXCLUSIVE_TERMS = [
  "靜置", // 步驟文字
  "瓣", // 用量單位
  "筷子", // 圖片替代文字
  "偏酸", // 小提醒
];

test("專屬詞確實只存在於不可搜尋的來源（測試前提）", () => {
  for (const term of EXCLUSIVE_TERMS) {
    expect(
      recipes.some((recipe) =>
        recipe.unsearchableTexts.some((text) => text.includes(term)),
      ),
      `${term} 應出現在某個不可搜尋來源`,
    ).toBe(true);
    for (const recipe of recipes) {
      const searchable = [
        recipe.title,
        recipe.summary,
        ...recipe.ingredientNames,
        ...recipe.aliases,
        ...recipe.tags,
      ];
      expect(
        searchable.some((text) => text.includes(term)),
        `${term} 不應出現在 ${recipe.id} 的可搜尋欄位`,
      ).toBe(false);
    }
  }
});

test("每道菜譜的菜名、第一項材料、每個別名與標籤都查得到它", async ({
  page,
}) => {
  await page.goto("/");
  for (const recipe of recipes) {
    const queries = [
      recipe.title,
      recipe.ingredientNames[0]!,
      ...recipe.aliases,
      ...recipe.tags,
    ];
    for (const q of queries) {
      await search(page, q);
      await expect(rowOf(page, recipe), `搜尋「${q}」`).toBeVisible();
    }
  }
});

test("搜尋結果依相關度排序，菜名命中的排最前", async ({ page }) => {
  await page.goto("/");
  for (const recipe of recipes) {
    await search(page, recipe.title);
    await expect(rows(page).first()).toContainText(recipe.title);
  }
});

test("菜名含有該字詞的菜譜排在只在其他欄位命中的菜譜之前", async ({ page }) => {
  await page.goto("/");
  const chars = new Set(recipes.flatMap((recipe) => [...recipe.title]));
  for (const char of chars) {
    await search(page, char);
    // 輸入後清單是非同步更新；輪詢到「命中菜名的都排在前面」為止
    await expect
      .poll(
        async () => {
          const order = (await titles(page)).map((title) =>
            title.includes(char),
          );
          const firstMiss = order.indexOf(false);
          return firstMiss === -1 || !order.slice(firstMiss).includes(true);
        },
        { message: `搜尋「${char}」` },
      )
      .toBe(true);
  }
});

test("有字詞時只留符合的菜譜；清空後回到依菜名排序的全部清單", async ({
  page,
}) => {
  await page.goto("/");
  const all = recipes.map((recipe) => recipe.title);
  await search(page, recipes[0]!.aliases[0]!);
  await expect(rows(page)).toHaveCount(1);
  await search(page, "");
  await expect(rows(page)).toHaveCount(recipes.length);
  expect(await titles(page)).toEqual(all);
});

test("只出現在步驟、用量單位、替代文字或小提醒的詞查不到", async ({ page }) => {
  await page.goto("/");
  for (const term of EXCLUSIVE_TERMS) {
    await search(page, term);
    await expect(emptyMessage(page), `搜尋「${term}」`).toContainText(term);
    await expect(status(page)).toContainText("符合 0 道");
    await expect(rows(page)).toHaveCount(0);
  }
});

test("首頁等非菜譜頁的文字不進索引", async ({ page }) => {
  await page.goto("/");
  // 首頁才有的字（配菜入口）：Pagefind 會因為「配」等單字命中菜譜而退回部分匹配，
  // 前端的全字詞過濾要把它擋成零筆。
  for (const term of ["配一桌四菜一湯", "煮奔"]) {
    await search(page, term);
    await expect(emptyMessage(page), `搜尋「${term}」`).toContainText(term);
    await expect(rows(page)).toHaveCount(0);
  }
});

test("多字中文查詢要每個字詞都命中，不退回部分匹配", async ({ page }) => {
  await page.goto("/");
  // 「的」只在某道菜的摘要出現，其餘字詞都不存在；
  // 「快手」是蛋花湯的標籤，不應帶出其他菜譜。
  await search(page, "不存在的詞");
  await expect(rows(page)).toHaveCount(0);
  await expect(emptyMessage(page)).toContainText("不存在的詞");

  for (const recipe of recipes) {
    for (const tag of recipe.tags) {
      await search(page, tag);
      const expected = recipes.filter((other) =>
        [
          other.title,
          other.summary,
          ...other.ingredientNames,
          ...other.aliases,
          ...other.tags,
        ].some((text) => text.includes(tag)),
      );
      await expect(rows(page), `搜尋「${tag}」`).toHaveCount(expected.length);
    }
  }
});

test("草稿不出現在搜尋結果", async ({ page }) => {
  await page.goto("/");
  for (const draft of drafts) {
    await search(page, draft.title);
    await expect(emptyMessage(page)).toContainText(draft.title);
    await expect(rows(page)).toHaveCount(0);
    await expect(page.getByRole("link", { name: draft.title })).toHaveCount(0);
  }
});

test("篩選在有字詞時只回該篩選下的菜", async ({ page }) => {
  await page.goto("/");
  for (const recipe of recipes) {
    const own =
      recipe.category !== "非湯料理"
        ? [recipe.category]
        : [
            ...(recipe.vegetable ? ["蔬菜菜"] : []),
            ...(recipe.protein ? ["蛋白質菜"] : []),
          ];
    const others = ["湯", "蔬菜菜", "蛋白質菜", "主食"].filter(
      (name) => !own.includes(name),
    );

    for (const name of own) {
      await page.getByRole("button", { name, exact: true }).click();
      await search(page, recipe.title);
      await expect(
        rowOf(page, recipe),
        `${name}：${recipe.title}`,
      ).toBeVisible();
    }
    for (const name of others) {
      await page.getByRole("button", { name, exact: true }).click();
      await expect(rowOf(page, recipe), `${name}：${recipe.title}`).toHaveCount(
        0,
      );
    }
  }
});

test("篩選在無字詞時依菜名排序，且網址 kind 值與按鈕對應", async ({ page }) => {
  await page.goto("/");
  await search(page, recipes[0]!.title);
  await page.getByRole("button", { name: "湯", exact: true }).click();
  await expect(page).toHaveURL(/kind=soup/);
  await search(page, "");
  await expect(rows(page)).toHaveCount(soups.length);
  expect(await titles(page)).toEqual(soups.map((recipe) => recipe.title));
});

test("篩選與搜尋並用：結果是兩者的交集", async ({ page }) => {
  const both = recipes.find((recipe) => recipe.vegetable && recipe.protein)!;
  await page.goto("/");
  await page.getByRole("button", { name: "蛋白質菜" }).click();
  await search(page, both.title);
  await expect(rowOf(page, both)).toBeVisible();
  await expect(page).toHaveURL(/kind=protein/);
  await expect(page).toHaveURL(/q=/);
  await expect(status(page)).toContainText("符合");

  // 搜尋同一字詞，篩選換成湯就沒有結果
  await page.getByRole("button", { name: "湯", exact: true }).click();
  await expect(rows(page)).toHaveCount(0);
});

test("字詞與篩選寫進網址，重新整理與開啟連結都能還原", async ({ page }) => {
  const recipe = recipes[0]!;
  await page.goto("/");
  await search(page, recipe.title);
  await expect(page).toHaveURL(
    new RegExp(`[?&]q=${encodeURIComponent(recipe.title)}(&|$)`),
  );

  await page.getByRole("button", { name: "全部" }).click();
  const url = page.url();

  await page.reload();
  await expect(box(page)).toHaveValue(recipe.title);
  await expect(rowOf(page, recipe)).toBeVisible();

  await page.goto("/");
  await expect(rows(page)).toHaveCount(recipes.length);
  await page.goto(url);
  await expect(box(page)).toHaveValue(recipe.title);
  await expect(rowOf(page, recipe)).toBeVisible();
});

test("kind 寫進網址並與字詞一起還原", async ({ page }) => {
  const soup = soups[0]!;
  await page.goto(`/?q=${encodeURIComponent(soup.title)}&kind=soup`);
  await expect(box(page)).toHaveValue(soup.title);
  await expect(
    page.getByRole("button", { name: "湯", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(rowOf(page, soup)).toBeVisible();
  await expect(rows(page)).toHaveCount(1);
});

test("上一頁依網址還原搜尋字詞", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "湯", exact: true }).click();
  await search(page, soups[0]!.title);
  await expect(page).toHaveURL(/q=/);
  await page.goto("/recipes/tomato-egg/");
  await page.goBack();
  await expect(box(page)).toHaveValue(soups[0]!.title);
  await expect(rowOf(page, soups[0]!)).toBeVisible();
});

test("符合筆數寫在搜尋框下方的提示，全頁只有一個朗讀區", async ({ page }) => {
  await page.goto("/");
  await expect(status(page)).toHaveCount(1);

  await expect(status(page)).toHaveText(`共 ${recipes.length} 道`);

  const title = recipes[0]!.title;
  await search(page, title);
  await expect(rows(page)).toHaveCount(1);
  await expect(status(page)).toHaveText(`「${title}」符合 1 道`);

  await search(page, "zzzz");
  await expect(status(page)).toHaveText("「zzzz」符合 0 道");
  await expect(status(page)).toHaveCount(1);
});

test("零筆時顯示訊息與清除條件按鈕，不自動放寬；清除後回到全部", async ({
  page,
}) => {
  const recipe = recipes.find((r) => r.category === "非湯料理")!;
  await page.goto("/");
  await page.getByRole("button", { name: "湯", exact: true }).click();
  // 這道菜不是湯：只有篩選擋住它。不放寬代表仍然零筆。
  await search(page, recipe.title);
  await expect(emptyMessage(page)).toContainText(recipe.title);
  await expect(rows(page)).toHaveCount(0);

  await page.getByRole("button", { name: "清除條件" }).click();
  await expect(emptyMessage(page)).toBeHidden();
  await expect(rows(page)).toHaveCount(recipes.length);
  await expect(box(page)).toHaveValue("");
  await expect(box(page)).toBeFocused();
  await expect(page).not.toHaveURL(/[?&](q|kind)=/);
  await expect(page.getByRole("button", { name: "全部" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("有結果時不顯示零筆訊息與清除按鈕", async ({ page }) => {
  await page.goto("/");
  await expect(emptyMessage(page)).toBeHidden();
  await expect(page.getByRole("button", { name: "清除條件" })).toBeHidden();
});

test("按 Enter 不重新載入頁面、不丟狀態，並立即套用目前字詞", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "湯", exact: true }).click();
  await page.evaluate(() => {
    (window as unknown as { marker: boolean }).marker = true;
  });
  const soup = soups[0]!;
  await box(page).fill(soup.title);
  await box(page).press("Enter");
  await expect(rowOf(page, soup)).toBeVisible();
  await expect(page).toHaveURL(/kind=soup/);
  await expect(page).toHaveURL(/q=/);
  expect(
    await page.evaluate(
      () => (window as unknown as { marker?: boolean }).marker,
    ),
  ).toBe(true);
});

test("字詞只有空白視為沒有字詞", async ({ page }) => {
  await page.goto("/");
  await search(page, "   ");
  await expect(rows(page)).toHaveCount(recipes.length);
  await expect(page).not.toHaveURL(/q=/);
  await expect(emptyMessage(page)).toBeHidden();
});

test("手機搜尋中收起成品大圖，清空後再出現", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/");
  await expect(hero(page)).toBeVisible();
  await search(page, recipes[0]!.title);
  await expect(hero(page)).toBeHidden();
  const searchBox = await box(page).boundingBox();
  const firstRow = await rows(page).first().boundingBox();
  // 結果緊接在搜尋框下方：中間不再隔著一張大圖（大圖高度遠大於此間距）
  expect(firstRow!.y - (searchBox!.y + searchBox!.height)).toBeLessThan(400);
  await search(page, "");
  await expect(hero(page)).toBeVisible();
});

test("寬螢幕搜尋時成品大圖仍在", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto("/");
  await search(page, recipes[0]!.title);
  await expect(rowOf(page, recipes[0]!)).toBeVisible();
  await expect(hero(page)).toBeVisible();
});

test("搜尋框與清除條件按鈕觸控目標至少 44×44，鍵盤焦點可見", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/");
  await search(page, "zzzz");
  const searchBox = await box(page).boundingBox();
  expect(searchBox!.width).toBeGreaterThanOrEqual(44);
  expect(searchBox!.height).toBeGreaterThanOrEqual(44);
  const clear = page.getByRole("button", { name: "清除條件" });
  await expect(clear).toBeVisible();
  const size = await clear.boundingBox();
  expect(size!.width).toBeGreaterThanOrEqual(44);
  expect(size!.height).toBeGreaterThanOrEqual(44);
  await clear.focus();
  const outline = await clear.evaluate(
    (el) => getComputedStyle(el).outlineStyle,
  );
  expect(outline).not.toBe("none");
});

test("輸入法組字中不觸發搜尋，組字完成才套用", async ({ page }) => {
  await page.goto("/");
  const cdp = await page.context().newCDPSession(page);
  await box(page).focus();
  const title = recipes[0]!.title;

  await cdp.send("Input.imeSetComposition", {
    text: title,
    selectionStart: title.length,
    selectionEnd: title.length,
  });
  // 防抖時間之外多等一會兒，證明沒有搜尋被觸發
  await page.waitForTimeout(800);
  await expect(page).not.toHaveURL(/q=/);
  await expect(status(page)).toHaveText(`共 ${recipes.length} 道`);
  await expect(rows(page)).toHaveCount(recipes.length);

  await cdp.send("Input.insertText", { text: title });
  await expect(status(page)).toContainText(`「${title}」符合`);
  await expect(page).toHaveURL(/q=/);
});
