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

  test("桌機寬度（≥601px）不顯示選單按鈕，導覽連結直接展開可見", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto("/");

    const toggleBtn = page.getByRole("button", { name: "選單" });
    const nav = page.getByRole("navigation", { name: "主選單" });

    await expect(toggleBtn).toBeHidden();
    await expect(nav.getByRole("link", { name: "菜譜" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "食材介紹" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "我的收藏" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "四菜一湯" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "關於" })).toBeVisible();
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
