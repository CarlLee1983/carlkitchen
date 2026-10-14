import { expect, test } from "@playwright/test";
import {
  expectNoHorizontalScroll,
  expectTouchTargets,
  tabTo,
} from "./a11y-helpers";

test.describe("手機版導覽選單", () => {
  test("手機寬度下平時收合，點擊漢堡按鈕展開選單，再次點擊收合", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const toggleBtn = page.getByRole("button", { name: "選單" });
    const nav = page.getByRole("navigation", { name: "主選單" });
    const recipesLink = nav.getByRole("link", { name: "菜譜" });

    // 初始狀態：按鈕可見且 aria-expanded="false"，連結在收合時不應可見
    await expect(toggleBtn).toBeVisible();
    await expect(toggleBtn).toHaveAttribute("aria-expanded", "false");
    await expect(recipesLink).toBeHidden();

    // 點擊展開
    await toggleBtn.click();
    await expect(toggleBtn).toHaveAttribute("aria-expanded", "true");
    await expect(recipesLink).toBeVisible();

    // 再次點擊收合
    await toggleBtn.click();
    await expect(toggleBtn).toHaveAttribute("aria-expanded", "false");
    await expect(recipesLink).toBeHidden();
  });

  test("手機展開選單後按 Escape 鍵可關閉選單，且焦點回到選單按鈕", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const toggleBtn = page.getByRole("button", { name: "選單" });
    const nav = page.getByRole("navigation", { name: "主選單" });

    await toggleBtn.click();
    await expect(toggleBtn).toHaveAttribute("aria-expanded", "true");
    await expect(nav.getByRole("link", { name: "菜譜" })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(toggleBtn).toHaveAttribute("aria-expanded", "false");
    await expect(nav.getByRole("link", { name: "菜譜" })).toBeHidden();
    await expect(toggleBtn).toBeFocused();
  });

  test("手機選單展開時點擊連結可正常導航並收合", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const toggleBtn = page.getByRole("button", { name: "選單" });
    await toggleBtn.click();

    const aboutLink = page
      .getByRole("navigation", { name: "主選單" })
      .getByRole("link", { name: "關於" });
    await aboutLink.click();
    await expect(page).toHaveURL(/\/about\/$/);
  });

  test("桌機寬度（≥768px）不顯示選單按鈕，導覽連結直接展開可見", async ({
    page,
  }) => {
    for (const width of [768, 800, 1024]) {
      await page.setViewportSize({ width, height: 768 });
      await page.goto("/");

      const toggleBtn = page.getByRole("button", { name: "選單" });
      const nav = page.getByRole("navigation", { name: "主選單" });

      await expect(toggleBtn).toBeHidden();
      await expect(nav.getByRole("link", { name: "菜譜" })).toBeVisible();
      await expect(nav.getByRole("link", { name: "食材介紹" })).toBeVisible();
      await expect(nav.getByRole("link", { name: "我的收藏" })).toBeVisible();
      await expect(nav.getByRole("link", { name: "四菜一湯" })).toBeVisible();
      await expect(nav.getByRole("link", { name: "關於" })).toBeVisible();
      const tops = await nav
        .locator(".site-nav-links a")
        .evaluateAll((links) =>
          links.map((link) => Math.round(link.getBoundingClientRect().top)),
        );
      expect(new Set(tops).size).toBe(1);
      const header = await page.locator(".site-header").boundingBox();
      expect(header!.height).toBeLessThanOrEqual(80);
      await expectNoHorizontalScroll(page, "/");
    }
  });

  test("選單按鈕與展開後的連結觸控目標至少 44×44，且無水平捲動", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const toggleBtn = page.getByRole("button", { name: "選單" });
    const nav = page.getByRole("navigation", { name: "主選單" });

    // 檢查選單按鈕觸控大小
    const btnBox = await toggleBtn.boundingBox();
    expect(btnBox!.width).toBeGreaterThanOrEqual(44);
    expect(btnBox!.height).toBeGreaterThanOrEqual(44);

    // 展開並檢查各連結觸控大小
    await toggleBtn.click();
    const links = await nav.getByRole("link").all();
    for (const link of links) {
      if (await link.isVisible()) {
        const box = await link.boundingBox();
        expect(box!.width).toBeGreaterThanOrEqual(44);
        expect(box!.height).toBeGreaterThanOrEqual(44);
      }
    }

    await expectNoHorizontalScroll(page, "/");
  });
});

for (const width of [640, 720]) {
  test(`${width}px 頁首站名不折行且導覽維持單列高度`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const header = await page.locator(".site-header").boundingBox();
    expect(header!.height).toBeLessThanOrEqual(80);
    const brand = page.getByRole("link", { name: "煮奔", exact: true });
    const name = await brand.getByText("煮奔", { exact: true }).boundingBox();
    expect(name!.width).toBeGreaterThan(name!.height);
    const toggle = page.getByRole("button", { name: "選單" });
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(
      page
        .getByRole("navigation", { name: "主選單" })
        .getByRole("link", { name: "關於" }),
    ).toBeVisible();
    await expectNoHorizontalScroll(page, "/");
  });
}

test("停用 JavaScript 時手機仍能從主選單前往食材介紹", async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByRole("button", { name: "選單" })).toBeHidden();
  const link = page
    .getByRole("navigation", { name: "主選單" })
    .getByRole("link", { name: "食材介紹" });
  await expect(link).toBeVisible();
  await link.click();
  await expect(page).toHaveURL(/\/ingredients\/$/);
  await expectNoHorizontalScroll(page, "/ingredients/");
  await context.close();
});

for (const width of [390, 1280]) {
  test(`鍵盤可跳過主選單，將焦點移至主內容（${width}px）`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/recipes/tomato-egg/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "跳至主內容" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("main")).toBeFocused();
    await page.keyboard.press("Tab");
    const focused = page.locator(":focus");
    expect(await focused.evaluate((el) => Boolean(el.closest("main")))).toBe(
      true,
    );
  });
}

test("手機導覽不會在延遲腳本載入後推移主內容", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let releaseScripts!: () => void;
  const scriptsReady = new Promise<void>((resolve) => {
    releaseScripts = resolve;
  });
  // 模擬延後執行的模組，讓首次排版先發生；同步頁首腳本不受影響。
  await page.route("**/about/", async (route) => {
    const response = await route.fetch();
    const html = (await response.text()).replaceAll(
      '<script type="module">',
      '<script type="module">await fetch("/_astro/delayed-script.js");',
    );
    await route.fulfill({ response, body: html });
  });
  await page.route("**/_astro/delayed-script.js", async (route) => {
    await scriptsReady;
    await route.fulfill({ body: "", contentType: "text/javascript" });
  });
  await page.goto("/about/", { waitUntil: "commit" });
  const main = page.getByRole("main");
  await expect(main).toBeAttached();
  const before = await main.boundingBox();
  releaseScripts();
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("button", { name: "選單" })).toBeVisible();
  const after = await main.boundingBox();
  expect(Math.abs(after!.y - before!.y)).toBeLessThanOrEqual(1);
});
