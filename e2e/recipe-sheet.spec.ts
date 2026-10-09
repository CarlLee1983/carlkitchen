import { test, expect } from "@playwright/test";

for (const width of [390, 1280]) {
  test(`菜單圖片列印只有一頁（${width}px）`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/recipes/tomato-egg/");
    const actions = page.locator(".recipe-actions");
    const box = await actions.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    await page.emulateMedia({ media: "print" });
    await page
      .locator(".print-sheet")
      .evaluate(async (image: HTMLImageElement) => {
        await image.decode();
      });
    // 保留一點分頁餘裕，避免手機列印引擎在整頁高度邊界進位。
    const sheet = await page.locator(".print-sheet").boundingBox();
    expect(sheet!.height).toBeLessThan(297 * (96 / 25.4) - 1);
    const pdf = await page.pdf({ format: "A4", preferCSSPageSize: true });
    expect(pdf.toString("latin1").match(/\/Type\s*\/Page(?!s)/g)).toHaveLength(
      1,
    );
  });
}

test("菜單圖片可單獨查看及下載，無圖菜譜不提供動作", async ({ page }) => {
  await page.goto("/recipes/tomato-egg/");
  const preview = page.getByRole("link", { name: "查看菜單圖片" });
  const popupPromise = page.waitForEvent("popup");
  await preview.click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL(/\/prints\/tomato-egg.webp$/);
  await popup.close();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "下載圖片" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("tomato-egg.webp");
  expect(await download.failure()).toBeNull();
  await page.goto("/recipes/garlic-greens/");
  await expect(page.getByRole("link", { name: "查看菜單圖片" })).toHaveCount(0);
});

test("支援檔案分享時分享菜單圖片，取消後可再試", async ({ page }) => {
  await page.addInitScript(() => {
    let calls = 0;
    Object.defineProperty(navigator, "canShare", { value: () => true });
    Object.defineProperty(navigator, "share", {
      value: async (data: ShareData) => {
        calls++;
        if (calls === 1) throw new DOMException("取消", "AbortError");
        document.body.dataset.shared = `${data.files?.[0]?.name}:${data.files?.[0]?.type}`;
      },
    });
  });
  await page.goto("/recipes/tomato-egg/");
  const share = page.getByRole("button", { name: "分享圖片" });
  await expect(share).toBeEnabled();
  await share.click();
  await expect(share).toBeEnabled();
  await expect(page.getByRole("status")).toBeEmpty();
  await share.click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-shared",
    "tomato-egg.webp:image/webp",
  );
});

for (const reason of ["unsupported", "rejected", "fetch-failed"]) {
  test(`分享圖片有可用的下載備援：${reason}`, async ({ page }) => {
    await page.addInitScript((reason) => {
      Object.defineProperty(navigator, "canShare", {
        value: () => reason !== "unsupported",
      });
      Object.defineProperty(navigator, "share", {
        value: async () => {
          throw new DOMException("拒絕", "NotAllowedError");
        },
      });
    }, reason);
    if (reason === "fetch-failed")
      await page.route("**/prints/tomato-egg.webp", (route) => route.abort());
    await page.goto("/recipes/tomato-egg/");
    const share = page.getByRole("button", { name: "分享圖片" });
    await expect(share).toBeEnabled();
    await share.click();
    await expect(page.getByRole("status")).toContainText("下載圖片");
    await expect(page.getByRole("link", { name: "下載圖片" })).toBeVisible();
  });
}
