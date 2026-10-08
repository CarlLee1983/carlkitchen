import { expect, test, type Page } from "@playwright/test";

// 這支規格跑在 show-more 專案：預設的固定菜譜以小批量（HOME_BATCH_SIZE）建置，
// 讓按鈕文字在固定菜譜下至少更新幾次。批量與總數都從頁面讀，不寫死。
const list = (page: Page) => page.getByRole("region", { name: "菜譜清單" });
const rows = (page: Page) => list(page).getByRole("listitem");
const moreButton = (page: Page) =>
  list(page).getByRole("button", { name: /^再顯示/ });
const count = (page: Page) => page.getByRole("status");
const box = (page: Page) => page.getByRole("searchbox");
const emptyMessage = (page: Page) => page.getByText("找不到符合");
const rowTitles = (page: Page) =>
  rows(page).getByRole("heading").allTextContents();

/** 按鈕文字照實寫出本次再顯示的道數（不超過一批）與剩餘道數。 */
const expectMoreButton = (page: Page, batch: number, remaining: number) =>
  expect(moreButton(page)).toHaveText(
    `再顯示 ${Math.min(batch, remaining)} 道（還有 ${remaining} 道）`,
  );

/** 讀無字詞時狀態列的「共 N 道」；先等它出現，讀不到就明確失敗。 */
async function readListTotal(page: Page) {
  await expect(count(page)).toContainText(/共 \d+ 道/);
  const total = (await count(page).textContent())?.match(/共 (\d+) 道/)?.[1];
  expect(total, "狀態列要有「共 N 道」").toBeDefined();
  return Number(total);
}

/** 讀搜尋時狀態列的結果總列數：菜譜列加專題列。 */
async function readResultTotal(page: Page) {
  await expect(count(page)).toContainText(/符合 \d+ 道/);
  const text = (await count(page).textContent()) ?? "";
  return (
    Number(text.match(/符合 (\d+) 道/)?.[1]) +
    Number(text.match(/專題 (\d+) 篇/)?.[1] ?? 0)
  );
}

/** 從頁面讀每批數量與菜譜總數（「共 N 道」）。 */
async function readSizes(page: Page) {
  const batch = Number(await moreButton(page).getAttribute("data-batch"));
  return { batch, total: await readListTotal(page) };
}

/** 輸入字詞並等到結果套用（狀態列寫出「「字詞」符合 N 道」；無字詞時「共 N 道」）。 */
async function search(page: Page, q: string) {
  await box(page).fill(q);
  await expect(count(page), `等待搜尋「${q}」套用`).toContainText(
    q ? `「${q}」符合` : "共",
  );
}

/** 一直按到按鈕消失，回傳最後可見的列數。 */
async function expandAll(page: Page) {
  while (await moreButton(page).isVisible()) await moreButton(page).click();
  return rows(page).count();
}

/**
 * 搜尋 q 並展開全部，取得完整的相關度順序；再清空重搜，讓清單停在重設後的第一批。
 * 先清空再搜，是因為同一字詞不會重新渲染，也要確認是從重設後的第一批開始。
 */
async function searchAndReturnOrder(page: Page, q: string) {
  await search(page, q);
  await expandAll(page);
  const order = await rowTitles(page);
  await search(page, "");
  await search(page, q);
  return order;
}

test("固定菜譜多於兩批，才能驗證按鈕文字更新", async ({ page }) => {
  await page.goto("/");
  const { batch, total } = await readSizes(page);
  expect(batch).toBeGreaterThanOrEqual(1);
  expect(total).toBeGreaterThan(batch * 2);
});

test("初始只顯示一批與按鈕，按鈕文字寫出本次道數與剩餘道數", async ({
  page,
}) => {
  await page.goto("/");
  const { batch, total } = await readSizes(page);
  await expect(rows(page)).toHaveCount(batch);
  await expectMoreButton(page, batch, total - batch);
  await expect(count(page)).toHaveText(`共 ${total} 道`);
});

test("每按一次多顯示一批、文字更新、焦點移到新出現的第一道，到底後按鈕消失", async ({
  page,
}) => {
  await page.goto("/");
  const { batch, total } = await readSizes(page);
  let shown = batch;
  while (shown < total) {
    await expectMoreButton(page, batch, total - shown);
    await moreButton(page).click();
    await expect(rows(page)).toHaveCount(
      shown + Math.min(batch, total - shown),
    );
    await expect(rows(page).nth(shown).getByRole("link")).toBeFocused();
    shown += Math.min(batch, total - shown);
  }
  await expect(moreButton(page)).toBeHidden();
  await expect(count(page)).toHaveText(`共 ${total} 道`);
});

test("展開後切換篩選，清單回到只顯示第一批", async ({ page }) => {
  await page.goto("/");
  const { batch } = await readSizes(page);
  await expandAll(page);
  await page.getByRole("button", { name: "蔬菜" }).click();
  const filtered = await readListTotal(page);
  expect(filtered, "固定菜譜的蔬菜篩選要多於一批").toBeGreaterThan(batch);
  await expect(rows(page)).toHaveCount(batch);
  await expectMoreButton(page, batch, filtered - batch);
});

test("篩選結果超過一批時同樣截斷並有按鈕", async ({ page }) => {
  await page.goto("/");
  const { batch } = await readSizes(page);
  await page.getByRole("button", { name: "蔬菜" }).click();
  const filtered = await readListTotal(page);
  expect(filtered, "固定菜譜的蔬菜篩選要多於一批").toBeGreaterThan(batch);
  await expect(rows(page)).toHaveCount(batch);
  await expectMoreButton(page, batch, filtered - batch);
  expect(await expandAll(page)).toBe(filtered);
  await expect(count(page)).toHaveText(`共 ${filtered} 道`);
});

test("搜尋結果超過一批時依相關度順序截斷，而不是依菜名順序", async ({
  page,
}) => {
  await page.goto("/");
  const { batch } = await readSizes(page);
  await expandAll(page);
  const nameOrder = await rowTitles(page);

  // 「鹽」在固定菜譜裡命中多道菜，且相關度排第一的不是菜名順序的第一道
  const order = await searchAndReturnOrder(page, "鹽");
  const byName = nameOrder.filter((title) => order.includes(title));
  expect(
    order.slice(0, batch),
    "相關度的第一批要不同於菜名順序的第一批",
  ).not.toEqual(byName.slice(0, batch));
  expect(order.length).toBeGreaterThan(batch);

  await expect(rows(page)).toHaveCount(batch);
  expect(await rowTitles(page)).toEqual(order.slice(0, batch));
  await expectMoreButton(page, batch, order.length - batch);
});

test("搜尋命中專題時，專題列與菜譜列一起計入一批，第一批是相關度排最前的列", async ({
  page,
}) => {
  await page.goto("/");
  const { batch } = await readSizes(page);
  // 「蒜」同時命中菜譜（蒜香青菜）與專題（夏天的涼拌菜：蒜末）
  const order = await searchAndReturnOrder(page, "蒜");
  await expect(count(page)).toHaveText("「蒜」符合 1 道，專題 1 篇");
  const total = await readResultTotal(page);
  expect(total).toBeGreaterThan(batch);
  expect(order).toHaveLength(total);
  await expect(rows(page)).toHaveCount(batch);
  expect(await rowTitles(page)).toEqual(order.slice(0, batch));
  await expectMoreButton(page, batch, total - batch);
  expect(await expandAll(page)).toBe(total);
  await expect(rows(page).getByText("專題", { exact: true })).toHaveCount(1);
});

test("展開後改搜尋字詞，清單回到只顯示第一批", async ({ page }) => {
  await page.goto("/");
  const { batch } = await readSizes(page);
  await search(page, "鹽");
  expect(await readResultTotal(page)).toBeGreaterThan(batch);
  await expandAll(page);
  await search(page, "油");
  const total = await readResultTotal(page);
  expect(total).toBeGreaterThan(batch);
  await expect(rows(page)).toHaveCount(batch);
  await expectMoreButton(page, batch, total - batch);
});

test("展開後清空搜尋框，回到全部清單的第一批", async ({ page }) => {
  await page.goto("/");
  const { batch, total } = await readSizes(page);
  await search(page, "鹽");
  expect(await readResultTotal(page)).toBeGreaterThan(batch);
  await expandAll(page);
  await search(page, "");
  await expect(rows(page)).toHaveCount(batch);
  await expectMoreButton(page, batch, total - batch);
});

test("展開搜尋結果後走到空結果再清除條件，回到全部清單的第一批", async ({
  page,
}) => {
  // 「清除條件」按鈕只在空結果時出現，所以展開後必先經過一次換條件才按得到它
  await page.goto("/");
  const { batch, total } = await readSizes(page);
  await search(page, "鹽");
  expect(await readResultTotal(page)).toBeGreaterThan(batch);
  await expandAll(page);
  await search(page, "zzzz");
  await page.getByRole("button", { name: "清除條件" }).click();
  await expect(box(page)).toHaveValue("");
  await expect(count(page)).toHaveText(`共 ${total} 道`);
  await expect(rows(page)).toHaveCount(batch);
  await expectMoreButton(page, batch, total - batch);
});

test("空結果沒有按鈕，空狀態訊息照舊", async ({ page }) => {
  await page.goto("/");
  await search(page, "zzzz");
  await expect(rows(page)).toHaveCount(0);
  await expect(moreButton(page)).toBeHidden();
  await expect(emptyMessage(page)).toHaveText("找不到符合「zzzz」的菜譜。");
});

test("停用 JavaScript 時顯示完整清單，看不到按鈕", async ({
  page,
  browser,
  baseURL,
}) => {
  await page.goto("/");
  const { batch, total } = await readSizes(page);
  expect(total).toBeGreaterThan(batch);

  const context = await browser.newContext({
    baseURL,
    javaScriptEnabled: false,
  });
  const plain = await context.newPage();
  await plain.goto("/");
  await expect(rows(plain)).toHaveCount(total);
  await expect(moreButton(plain)).toBeHidden();
  await context.close();
});
