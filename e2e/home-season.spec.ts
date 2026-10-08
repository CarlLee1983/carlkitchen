import { expect, test, type Page } from "@playwright/test";
import data from "../src/data/solar-terms.json" with { type: "json" };
import { COMPUTED_YEARS_AHEAD } from "../src/utils/solar-term-calc";
import { solarTermArt } from "../src/utils/solar-terms";

const season = (page: Page) => page.getByRole("region", { name: "這個時節" });
const term = (page: Page) => season(page).locator("[data-solar-term]");

test("「這個時節」先列本期專題，再列依讀者當下時間選出的節氣", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-10-10T12:00:00+08:00"));
  await page.goto("/");
  const topic = season(page).getByRole("region", { name: "本期專題" });
  await expect(topic.getByRole("link")).toBeVisible();
  await expect(term(page)).toBeVisible();
  await expect(term(page)).toContainText("寒露");
  await expect(term(page)).toContainText("10 月 8 日");
  await expect(term(page)).toContainText("14:29");
  await expect(term(page)).toContainText("資料：中央氣象署");
  const topicBox = (await topic.boundingBox())!;
  const termBox = (await term(page).boundingBox())!;
  expect(termBox.y).toBeGreaterThanOrEqual(topicBox.y + topicBox.height);
});

test("節氣於交節時刻（臺灣時間）切換，不停在建置當下", async ({ page }) => {
  for (const [date, name] of [
    ["2026-10-23T17:37:00+08:00", "寒露"],
    ["2026-10-23T17:38:00+08:00", "霜降"],
    ["2027-06-21T22:10:00+08:00", "芒種"],
    ["2027-06-21T22:11:00+08:00", "夏至"],
  ]) {
    await page.clock.setFixedTime(new Date(date!));
    await page.goto("/");
    await expect(term(page).locator("strong")).toHaveText(name!);
  }
});

test("中央氣象署公告用完之後改用天文推算，並標示出處", async ({ page }) => {
  // 公告最後一年的隔年 3 月 1 日，當前節氣是雨水（2 月 19 日前後交節）。
  const afterOfficial = Number(data.terms.at(-1)!.date.slice(0, 4)) + 1;
  await page.clock.setFixedTime(
    new Date(`${afterOfficial}-03-01T12:00:00+08:00`),
  );
  await page.goto("/");
  await expect(term(page).locator("strong")).toHaveText("雨水");
  await expect(term(page)).toContainText("2 月");
  await expect(term(page)).toContainText("依天文推算");
  await expect(term(page)).not.toContainText("中央氣象署");
});

test("超出推算範圍時只隱藏節氣列，專題照常顯示", async ({ page }) => {
  // 推算補到建置年後 COMPUTED_YEARS_AHEAD 年；建置與測試同一天執行。
  const beyond = new Date().getFullYear() + COMPUTED_YEARS_AHEAD + 1;
  await page.clock.setFixedTime(new Date(`${beyond}-03-01T12:00:00+08:00`));
  await page.goto("/");
  await expect(term(page)).toBeHidden();
  await expect(
    season(page).getByRole("region", { name: "本期專題" }).getByRole("link"),
  ).toBeVisible();
});

test("停用 JavaScript 不顯示節氣，避免出現建置當下的過期節氣", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  await expect(term(page)).toBeHidden();
  await expect(
    season(page).getByRole("region", { name: "本期專題" }).getByRole("link"),
  ).toBeVisible();
  await context.close();
});

// 記錄頁面請求的節氣插畫（依檔名辨識），驗證實際下載而不只是 DOM。
const termArtRequests = (page: Page) => {
  const names = Object.values(solarTermArt).join("|");
  const pattern = new RegExp(`/_astro/(${names})\\.[^/]*\\.webp`);
  const requested: string[] = [];
  page.on("request", (request) => {
    const match = pattern.exec(request.url());
    if (match) requested.push(match[1]!);
  });
  return requested;
};

test("寬螢幕節氣列附插畫，只下載選中那一張的小尺寸", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.clock.setFixedTime(new Date("2026-10-10T12:00:00+08:00"));
  const requested = termArtRequests(page);
  await page.goto("/");
  const image = term(page).getByRole("img", { name: /寒露/ });
  await expect(image).toBeVisible();
  await expect(image).toHaveJSProperty("complete", true);
  const width = await image.evaluate((el: HTMLImageElement) => el.naturalWidth);
  expect(width).toBeLessThanOrEqual(256);
  expect(requested).toEqual(["hanlu"]);
});

test.describe("手機版（390×844）", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("節氣列只佔一行、不顯示也不下載插畫", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-10-10T12:00:00+08:00"));
    const requested = termArtRequests(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(term(page)).toBeVisible();
    await expect(term(page).getByRole("img")).toBeHidden();
    const { height, lineHeight } = await term(page).evaluate((el) => ({
      height: el.getBoundingClientRect().height,
      lineHeight: parseFloat(getComputedStyle(el).lineHeight),
    }));
    expect(height).toBeLessThanOrEqual(lineHeight + 1);
    expect(requested).toEqual([]);
  });
});
