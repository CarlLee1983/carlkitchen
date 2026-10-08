import { expect, test, type Page } from "@playwright/test";

// 這支規格跑在 show-more 專案：預設的固定菜譜以小批量（HOME_BATCH_SIZE）建置，
// 讓按鈕文字在固定菜譜下至少更新幾次。批量與總數都從頁面讀，不寫死。
const list = (page: Page) => page.getByRole("region", { name: "菜譜清單" });
const rows = (page: Page) => list(page).getByRole("listitem");
const moreButton = (page: Page) =>
  list(page).getByRole("button", { name: /^再顯示/ });
const count = (page: Page) => page.getByRole("status");

const label = (next: number, remaining: number) =>
  `再顯示 ${next} 道（還有 ${remaining} 道）`;

/** 從頁面讀每批數量與菜譜總數（「共 N 道」）。 */
async function readSizes(page: Page) {
  const batch = Number(await moreButton(page).getAttribute("data-batch"));
  const text = (await count(page).textContent()) ?? "";
  const total = Number(text.match(/共 (\d+) 道/)?.[1]);
  return { batch, total };
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
  await expect(moreButton(page)).toHaveText(label(batch, total - batch));
  await expect(count(page)).toHaveText(`共 ${total} 道`);
});

test("每按一次多顯示一批、文字更新、焦點移到新出現的第一道，到底後按鈕消失", async ({
  page,
}) => {
  await page.goto("/");
  const { batch, total } = await readSizes(page);
  let shown = batch;
  while (shown < total) {
    const next = Math.min(batch, total - shown);
    await expect(moreButton(page)).toHaveText(label(next, total - shown));
    await moreButton(page).click();
    await expect(rows(page)).toHaveCount(shown + next);
    await expect(rows(page).nth(shown).getByRole("link")).toBeFocused();
    shown += next;
  }
  await expect(moreButton(page)).toBeHidden();
  await expect(count(page)).toHaveText(`共 ${total} 道`);
});

test("展開後切換篩選，清單回到只顯示第一批", async ({ page }) => {
  await page.goto("/");
  const { batch, total } = await readSizes(page);
  // 展開到全部，再切到結果多於一批的篩選
  while ((await rows(page).count()) < total) await moreButton(page).click();
  await page.getByRole("button", { name: "蔬菜" }).click();
  const filtered = Number(
    (await count(page).textContent())?.match(/共 (\d+) 道/)?.[1],
  );
  expect(filtered).toBeGreaterThan(batch);
  await expect(rows(page)).toHaveCount(batch);
  await expect(moreButton(page)).toHaveText(
    label(Math.min(batch, filtered - batch), filtered - batch),
  );
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
