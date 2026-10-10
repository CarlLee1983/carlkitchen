import { expect, test, type Page } from "@playwright/test";
import { fixtureKindLabels, publishedFixtureRecipes } from "./fixture-recipes";
import { pickTitle, routePicks } from "./random-picks-helpers";

const recipes = publishedFixtureRecipes();
const idOf = (href: string) => href.replace(/^\/recipes\/|\/$/g, "");

const picks = (page: Page) => page.getByRole("region", { name: "今天煮什麼" });
const rows = (page: Page) =>
  page.getByRole("region", { name: "菜譜清單" }).getByRole("listitem");
const cards = (page: Page) => picks(page).getByRole("link");
const hero = (page: Page) =>
  page.getByRole("region", { name: "隨機看看一道菜" }).getByRole("link");

async function cardIds(page: Page) {
  return (
    await cards(page).evaluateAll((links) =>
      links.map((link) => link.getAttribute("href")),
    )
  ).map((href) => idOf(href!));
}

test("固定菜譜扣掉大圖後不足一批，全部顯示且不含大圖那道", async ({ page }) => {
  for (const value of [0, 0.999]) {
    await page.addInitScript((v) => {
      Math.random = () => v;
    }, value);
    await page.goto("/");
    await expect(cards(page)).toHaveCount(recipes.length - 1);
    const heroId = idOf((await hero(page).getAttribute("href"))!);
    const ids = await cardIds(page);
    expect(ids).not.toContain(heroId);
    expect(new Set(ids)).toEqual(
      new Set(recipes.map((r) => r.id).filter((id) => id !== heroId)),
    );
  }
});

test("標題在篩選區與菜譜清單之間，卡片顯示菜名並連到菜譜頁", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    picks(page).getByRole("heading", { level: 2, name: "今天煮什麼" }),
  ).toBeVisible();
  const heading = (await picks(page).boundingBox())!;
  const list = (await page
    .getByRole("region", { name: "菜譜清單" })
    .boundingBox())!;
  expect(heading.y + heading.height).toBeLessThanOrEqual(list.y + 1);
  const first = cards(page).first();
  const id = idOf((await first.getAttribute("href"))!);
  await expect(first).toContainText(recipes.find((r) => r.id === id)!.title);
  await first.click();
  await expect(page).toHaveURL(`/recipes/${id}/`);
});

test("寬版（1366）區塊在菜譜清單之前", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto("/");
  await expect(cards(page).first()).toBeVisible();
  const pickBox = (await picks(page).boundingBox())!;
  const listBox = (await page
    .getByRole("region", { name: "菜譜清單" })
    .boundingBox())!;
  expect(pickBox.y + pickBox.height).toBeLessThanOrEqual(listBox.y + 1);
});

test.describe("手機（390 寬）", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("區塊在清單第一批之後，一列橫向捲動，卡片只有一份", async ({ page }) => {
    await page.goto("/");
    await expect(cards(page).first()).toBeVisible();
    const pickBox = (await picks(page).boundingBox())!;
    const lastRow = (await page
      .getByRole("region", { name: "菜譜清單" })
      .getByRole("listitem")
      .last()
      .boundingBox())!;
    expect(pickBox.y).toBeGreaterThanOrEqual(lastRow.y + lastRow.height - 1);
    // 一列：所有卡片同高度起點，內容超出可視寬度而橫向捲動
    const tops = await cards(page).evaluateAll((links) =>
      links.map((link) => Math.round(link.getBoundingClientRect().top)),
    );
    expect(new Set(tops).size).toBe(1);
    const scroller = page.locator("[data-picks-list]");
    expect(
      await scroller.evaluate((el) => el.scrollWidth > el.clientWidth),
    ).toBe(true);
    // 同一批卡片不會同時出現在兩處
    await expect(page.locator("[data-random-picks]")).toHaveCount(1);
    await expect(page.locator("[data-picks-list] li")).toHaveCount(
      recipes.length - 1,
    );
  });

  test("縮放跨過 40rem 時區塊搬到對應位置", async ({ page }) => {
    await page.goto("/");
    await expect(cards(page).first()).toBeVisible();
    await page.setViewportSize({ width: 1366, height: 900 });
    const gap = async () => {
      const pickBox = (await picks(page).boundingBox())!;
      const listBox = (await page
        .getByRole("region", { name: "菜譜清單" })
        .boundingBox())!;
      return listBox.y - (pickBox.y + pickBox.height);
    };
    await expect.poll(gap).toBeGreaterThanOrEqual(-1);
  });
});

test("組出的卡片與 RecipeCard 元件的標記一致（class、aria-labelledby、圖片屬性）", async ({
  page,
}) => {
  const signature = (card: ReturnType<typeof cards>) =>
    card.first().evaluate((link) => {
      const names = (el: Element) =>
        el
          .getAttributeNames()
          .filter((name) => !name.startsWith("data-astro-cid"))
          .sort();
      const figure = link.querySelector("figure")!;
      const img = link.querySelector("img")!;
      const title = link.querySelector("span")!;
      const astroImage = Object.fromEntries(
        img
          .getAttributeNames()
          .filter((name) => name.startsWith("data-astro-image"))
          .map((name) => [name, img.getAttribute(name)]),
      );
      return {
        linkClass: link.className,
        linkAttrs: names(link),
        labelledbyMatchesTitle:
          link.getAttribute("aria-labelledby") === title.id &&
          title.id.startsWith("recipe-card-title-"),
        figureClass: figure.className,
        figureAttrs: names(figure),
        figureIgnore: figure.getAttribute("data-pagefind-ignore"),
        imgAttrs: names(img),
        loading: img.getAttribute("loading"),
        decoding: img.getAttribute("decoding"),
        astroImage,
        width: img.getAttribute("width"),
        height: img.getAttribute("height"),
        titleClass: title.className,
        titleAttrs: names(title),
        // 標籤是推薦卡片才有的選用部分，另由「料理主角標籤」測試檢查
        childTags: [...link.children]
          .filter((el) => !el.classList.contains("recipe-card-kind"))
          .map((el) => el.tagName),
      };
    });
  await page.goto("/");
  await expect(cards(page).first()).toBeVisible();
  const fromScript = await signature(cards(page));
  await page.goto("/recipes/tomato-egg/");
  const related = page.locator(".related-recipes .recipe-card");
  await expect(related.first()).toBeVisible();
  const fromComponent = await signature(related);
  expect(fromScript).toEqual(fromComponent);
});

test("卡片在菜名之後顯示料理主角標籤，文字同清單列，不計入連結名稱", async ({
  page,
}) => {
  await page.goto("/");
  await expect(cards(page).first()).toBeVisible();
  for (const card of await cards(page).all()) {
    const id = idOf((await card.getAttribute("href"))!);
    const fixture = recipes.find((r) => r.id === id)!;
    const label = card.locator(".recipe-card-kind");
    await expect(label).toHaveText(fixtureKindLabels(fixture).join("・"));
    // 結構：連結的子元素依序為圖、菜名、標籤；連結名稱只有菜名
    expect(
      await card.evaluate((el) =>
        [...el.children].map((child) => child.className || child.tagName),
      ),
    ).toEqual(["illustration", "recipe-card-title", "recipe-card-kind"]);
    await expect(card).toHaveAccessibleName(fixture.title);
  }
});

test("選料理主角後只剩該類，切換篩選立即重抽", async ({ page }) => {
  await page.goto("/");
  await expect(cards(page).first()).toBeVisible();
  for (const [label, kind] of [
    ["海鮮", "seafood"],
    ["蔬菜", "vegetable"],
  ] as const) {
    await page.getByRole("button", { name: label }).click();
    const expected = recipes
      .filter((r) => r.dishKinds.includes(kind))
      .map((r) => r.id);
    const heroId = idOf((await hero(page).getAttribute("href"))!);
    const wanted = expected.filter((id) => id !== heroId);
    await expect(cards(page)).toHaveCount(wanted.length);
    expect(new Set(await cardIds(page))).toEqual(new Set(wanted));
  }
});

test("該類扣掉大圖後沒有候選時整個區塊隱藏", async ({ page }) => {
  const soups = recipes.filter((r) => r.category === "湯");
  // 固定菜譜只有一道湯：大圖換成它之後，候選就是 0。
  expect(soups).toHaveLength(1);
  await page.goto("/");
  await page.getByRole("button", { name: "湯" }).click();
  await expect(hero(page)).toHaveAttribute("href", `/recipes/${soups[0]!.id}/`);
  await expect(picks(page)).toBeHidden();
  await page.getByRole("button", { name: "全部" }).click();
  await expect(picks(page)).toBeVisible();
});

test("有搜尋字時隱藏，清除後再出現", async ({ page }) => {
  await page.goto("/");
  await expect(picks(page)).toBeVisible();
  await page.getByRole("searchbox").fill(recipes[0]!.title);
  await expect(page.getByRole("status")).toContainText("符合");
  await expect(picks(page)).toBeHidden();
  await page.getByRole("searchbox").fill("");
  await expect(page.getByRole("status")).toContainText("共");
  await expect(picks(page)).toBeVisible();
  await expect(cards(page)).toHaveCount(recipes.length - 1);
});

test("網址帶搜尋字開啟時不顯示，也不下載推薦圖", async ({ page }) => {
  await page.goto(`/?q=${encodeURIComponent(recipes[0]!.title)}`);
  await expect(page.getByRole("status")).toContainText("符合");
  await expect(picks(page)).toBeHidden();
  await expect(page.locator("[data-random-picks] img")).toHaveCount(0);
});

test("卡片圖片延遲載入，不帶高優先序", async ({ page }) => {
  await page.goto("/");
  await expect(cards(page).first()).toBeVisible();
  const images = page.locator("[data-random-picks] img");
  expect(await images.count()).toBeGreaterThan(0);
  for (const image of await images.all()) {
    await expect(image).toHaveAttribute("loading", "lazy");
    await expect(image).not.toHaveAttribute("fetchpriority", "high");
  }
});

test("不寫入 history state 與瀏覽器儲存", async ({ page }) => {
  await page.goto("/");
  await expect(cards(page).first()).toBeVisible();
  const stored = await page.evaluate(() => ({
    state: history.state,
    local: localStorage.length,
    session: sessionStorage.length,
  }));
  expect(stored).toEqual({ state: null, local: 0, session: 0 });
});

test("停用 JavaScript 時不顯示，清單照常完整", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(baseURL!);
  await expect(page.locator("[data-random-picks]")).toBeHidden();
  await expect(page.getByRole("region", { name: "今天煮什麼" })).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "菜譜清單" }).getByRole("listitem"),
  ).toHaveCount(recipes.length);
  await context.close();
});

test("候選資料不在首頁 HTML，而是頁面載入後才抓的靜態 JSON，且只含已發布菜譜", async ({
  page,
  request,
}) => {
  const html = await (await request.get("/")).text();
  expect(html).not.toContain("data-picks-data");
  expect(html).not.toContain('"srcset"');
  expect(html).not.toContain("random-picks.json");

  const response = await request.get("/random-picks.json");
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("application/json");
  const data = (await response.json()) as {
    items: { id: string; title: string; kinds: string[]; srcset: string }[];
  };
  expect(data.items.map((item) => item.id).sort()).toEqual(
    recipes.map((r) => r.id).sort(),
  );
  for (const item of data.items) {
    expect(item.srcset).toContain("/_astro/");
    const fixture = recipes.find((r) => r.id === item.id)!;
    expect(item.title).toBe(fixture.title);
  }

  // 抓取發生在 load 之後，且整個瀏覽過程只抓一次（切換篩選重用）
  await page.goto("/");
  await expect(cards(page).first()).toBeVisible();
  await page.getByRole("button", { name: "海鮮" }).click();
  await page.getByRole("button", { name: "全部" }).click();
  const timing = await page.evaluate(() => {
    const nav = performance.getEntriesByType(
      "navigation",
    )[0] as PerformanceNavigationTiming;
    const fetches = performance
      .getEntriesByType("resource")
      .filter((entry) => entry.name.endsWith("/random-picks.json"));
    return {
      loadStart: nav.loadEventStart,
      fetchStarts: fetches.map((entry) => entry.startTime),
    };
  });
  expect(timing.fetchStarts).toHaveLength(1);
  expect(timing.fetchStarts[0]).toBeGreaterThanOrEqual(timing.loadStart);
});

test("抓取失敗時區塊維持隱藏，不報錯，清單照常", async ({ page }) => {
  const errors: string[] = [];
  const logged: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") logged.push(message.text());
  });
  await page.route("**/random-picks.json", (route) =>
    route.fulfill({ status: 500, body: "boom" }),
  );
  await page.goto("/");
  await expect(rows(page)).toHaveCount(recipes.length);
  await expect(page.locator("[data-random-picks]")).toBeHidden();
  await expect(page.locator("[data-random-picks][data-pending]")).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "海鮮" }).click();
  await expect(page.locator("[data-random-picks]")).toBeHidden();
  expect(errors).toEqual([]);
  // 失敗原因記在主控台，不丟未處理的例外
  expect(logged.some((text) => text.includes("載入隨機推薦失敗"))).toBe(true);
});

test("寬版資料到之前先預留位置，資料填入前後清單位置不變", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.route("**/random-picks.json", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    await route.continue();
  });
  await page.goto("/");
  const pending = page.locator("[data-random-picks][data-pending]");
  await expect(pending).toHaveCount(1);
  const before = (await rows(page).first().boundingBox())!.y;
  await expect(cards(page).first()).toBeVisible();
  await expect(pending).toHaveCount(0);
  const after = (await rows(page).first().boundingBox())!.y;
  expect(Math.abs(after - before)).toBeLessThanOrEqual(1);
});

const shuffle = (page: Page) => page.locator("[data-picks-shuffle]");
const titles = (page: Page) =>
  cards(page).locator(".recipe-card-title").allTextContents();
const overlap = (a: string[], b: string[]) => a.filter((x) => b.includes(x));

test("固定菜譜候選不超過一批，沒有換一批按鈕", async ({ page }) => {
  await page.goto("/");
  await expect(cards(page).first()).toBeVisible();
  await expect(shuffle(page)).toBeHidden();
  await expect(page.getByRole("button", { name: "換一批" })).toHaveCount(0);
});

test("12 道候選：換一批整批換新、兩批不交集，抽完一輪後重新開始", async ({
  page,
}) => {
  await routePicks(page, 12);
  await page.goto("/");
  await expect(cards(page)).toHaveCount(6);
  const button = page.getByRole("button", { name: "換一批" });
  await expect(button).toBeVisible();
  const first = await titles(page);
  await button.click();
  await expect.poll(() => titles(page)).not.toEqual(first);
  const second = await titles(page);
  expect(second).toHaveLength(6);
  expect(overlap(first, second)).toEqual([]);
  expect(new Set([...first, ...second]).size).toBe(12);
  // 12 道都出現過了，下一批開始新的一輪：仍是 6 道不重複
  await button.click();
  await expect
    .poll(async () => (await titles(page)).join())
    .not.toBe(second.join());
  const third = await titles(page);
  expect(third).toHaveLength(6);
  expect(new Set(third).size).toBe(6);
});

test("8 道候選：沒出現過的不足一批時先全出，再從新一輪補滿且同批不重複", async ({
  page,
}) => {
  await routePicks(page, 8);
  await page.goto("/");
  await expect(cards(page)).toHaveCount(6);
  const first = await titles(page);
  await page.getByRole("button", { name: "換一批" }).click();
  await expect
    .poll(async () => (await titles(page)).join())
    .not.toBe(first.join());
  const second = await titles(page);
  expect(second).toHaveLength(6);
  expect(new Set(second).size).toBe(6);
  // 沒出現過的 2 道一定在第二批；其餘 4 道從上一批補
  const unseen = Array.from({ length: 8 }, (_, i) => pickTitle(i)).filter(
    (title) => !first.includes(title),
  );
  expect(unseen).toHaveLength(2);
  for (const title of unseen) expect(second).toContain(title);
  expect(overlap(first, second)).toHaveLength(4);
});

test("切換料理主角重置這一輪，並依新類別決定要不要顯示按鈕", async ({
  page,
}) => {
  // 7 道：前 4 道海鮮、後 3 道肉類；亂數固定 0，抽批順序可預期
  await page.addInitScript(() => {
    Math.random = () => 0;
  });
  await routePicks(page, 7, (i) => (i < 4 ? "seafood" : "meat"));
  await page.goto("/");
  await expect(cards(page)).toHaveCount(6);
  await expect(shuffle(page)).toBeVisible();
  const all = Array.from({ length: 7 }, (_, i) => pickTitle(i));
  expect(await titles(page)).toEqual(all.slice(0, 6));
  // 換一批：沒出現過的 06 先出，再從頭補 5 道
  await shuffle(page).click();
  await expect
    .poll(() => titles(page))
    .toEqual([pickTitle(6), ...all.slice(0, 5)]);

  // 只剩 4 道海鮮：不超過一批，沒有按鈕
  await page.getByRole("button", { name: "海鮮" }).click();
  await expect(cards(page)).toHaveCount(4);
  await expect(shuffle(page)).toBeHidden();

  // 回全部：這一輪已重置，第一批又是前 6 道（沒重置的話會先出 05）
  await page.getByRole("button", { name: "全部" }).click();
  await expect.poll(() => titles(page)).toEqual(all.slice(0, 6));
  await expect(shuffle(page)).toBeVisible();
});

test("有搜尋字時整個區塊連同按鈕隱藏，清除後回來", async ({ page }) => {
  await routePicks(page, 12);
  await page.goto("/");
  await expect(shuffle(page)).toBeVisible();
  await page.getByRole("searchbox").fill(recipes[0]!.title);
  await expect(page.getByRole("status")).toContainText("符合");
  await expect(picks(page)).toBeHidden();
  await expect(shuffle(page)).toBeHidden();
  await page.getByRole("searchbox").fill("");
  await expect(page.getByRole("status")).toContainText("共");
  await expect(shuffle(page)).toBeVisible();
  await expect(cards(page)).toHaveCount(6);
});

test("換批後以不搶焦點的簡短提示告知報讀，焦點留在按鈕，版面不位移", async ({
  page,
}) => {
  await routePicks(page, 12);
  await page.goto("/");
  const button = page.getByRole("button", { name: "換一批" });
  await expect(button).toBeVisible();
  const status = page.locator("[data-picks-status]");
  await expect(status).toHaveAttribute("aria-live", "polite");
  await expect(status).toHaveText("");
  // 全頁只有搜尋筆數是 role=status，推薦的提示用 aria-live 不另開 status
  await expect(page.getByRole("status")).toHaveCount(1);
  const firstRow = page
    .getByRole("region", { name: "菜譜清單" })
    .getByRole("listitem")
    .first();
  // 以文件座標比較（focus 會捲動視窗，視窗座標會變）
  const docY = async () =>
    (await firstRow.boundingBox())!.y +
    (await page.evaluate(() => window.scrollY));
  const before = await docY();
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(status).toHaveText("已換一批");
  await expect(button).toBeFocused();
  expect(Math.abs((await docY()) - before)).toBeLessThanOrEqual(1);
});

test.describe("手機（390 寬）換一批", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("換批後橫向捲動回到最左邊，按鈕可觸控", async ({ page }) => {
    await routePicks(page, 12);
    await page.goto("/");
    const button = page.getByRole("button", { name: "換一批" });
    await expect(button).toBeVisible();
    const box = (await button.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.width).toBeGreaterThanOrEqual(44);
    const scroller = page.locator("[data-picks-list]");
    await scroller.evaluate((el) => {
      el.scrollLeft = 300;
    });
    expect(await scroller.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
    await button.click();
    await expect.poll(() => scroller.evaluate((el) => el.scrollLeft)).toBe(0);
  });
});
