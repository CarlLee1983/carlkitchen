import { expect, test } from "@playwright/test";

test("首頁按台北檔期切換一篇專題，結束後回到常青備選", async ({ page }) => {
  const feature = page.getByRole("region", { name: "本期專題" });
  for (const [date, title] of [
    ["2026-06-01T00:00:00+08:00", "夏天的涼拌菜"],
    ["2026-08-31T23:59:00+08:00", "夏天的涼拌菜"],
    ["2026-09-01T00:00:00+08:00", "刀工入門"],
    ["2026-10-31T16:00:00Z", "煮飯的基本功"],
    ["2026-11-04T00:00:00+08:00", "刀工入門"],
    ["2027-11-01T00:00:00+08:00", "刀工入門"],
  ]) {
    await page.clock.setFixedTime(new Date(date!));
    await page.goto("/");
    await expect(feature.getByRole("link")).toHaveText(new RegExp(title!));
    await expect(feature.getByRole("img")).toBeVisible();
    await expect(feature.getByRole("link")).toHaveCount(1);
  }
  await expect(page.locator("[data-home-topic-candidates]")).not.toContainText(
    "draft-topic",
  );
});

test("沒有當期專題且未指定備選時隱藏推薦區", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-08T12:00:00+08:00"));
  // 模擬站主撤下常青備選；其餘 HTML 與選題腳本仍使用實際建置輸出。
  await page.route("**/", async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replaceAll(
      '"homeFallback":true',
      '"homeFallback":false',
    );
    await route.fulfill({ response, body });
  });
  await page.goto("/");
  await expect(page.getByRole("region", { name: "本期專題" })).toBeHidden();
});

test("停用 JavaScript 仍顯示常青專題與可用連結", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  const feature = page.getByRole("region", { name: "本期專題" });
  await expect(feature.getByRole("link")).toHaveAttribute(
    "href",
    "/topics/knife-skills/",
  );
  await feature.getByRole("link").click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("刀工入門");
  await context.close();
});
