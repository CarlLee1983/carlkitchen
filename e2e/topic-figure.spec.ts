import { expect, test } from "@playwright/test";
import { expectNoAxeViolations, expectNoOverflowNow } from "./a11y-helpers";

test("固定專題的互動圖有關鍵狀態、完整階段、替代文字與圖說", async ({
  page,
}) => {
  await page.goto("/topics/knife-skills/");
  const figure = page.locator('figure[data-topic-figure="peanut-frying"]');
  await expect(figure).toBeVisible();
  await expect(
    figure.getByRole("img", { name: /固定資料：等角炒鍋/ }),
  ).toBeVisible();
  await expect(figure.locator("ol li")).toHaveCount(5);
  await expect(figure.getByText("觀察轉色", { exact: true })).toBeVisible();
  await expect(figure.locator("figcaption")).toContainText(
    "固定資料：炸花生從冷油到放涼的階段",
  );
  await expect(figure.locator('li[data-current="true"]')).toContainText(
    "7–12 分鐘",
  );
  await expectNoAxeViolations(page, "固定專題互動圖");
});

test("互動圖在手機寬度不造成水平捲動", async ({ page }) => {
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/topics/knife-skills/");
    await expect(
      page.locator('figure[data-topic-figure="peanut-frying"]'),
    ).toBeVisible();
    await expectNoOverflowNow(page, `${width}px 固定專題互動圖`);
  }
});

test("SVG 的帶膜、去膜與階段狀態各有不同外觀", async ({ page }) => {
  await page.goto("/topics/knife-skills/");
  const figure = page.locator('figure[data-topic-figure="peanut-frying"]');
  const peanut = figure.locator(".wok-peanut ellipse").first();
  const colors = new Map<string, string>();
  for (const stage of ["start", "bubbles", "colour", "rest", "cool"]) {
    await figure.evaluate(
      (element, value) => element.setAttribute("data-stage", value),
      stage,
    );
    for (const variant of ["skin", "peeled"]) {
      await figure.evaluate(
        (element, value) => element.setAttribute("data-variant", value),
        variant,
      );
      colors.set(
        `${stage}:${variant}`,
        await peanut.evaluate((element) => getComputedStyle(element).fill),
      );
    }
    expect(colors.get(`${stage}:skin`)).not.toBe(colors.get(`${stage}:peeled`));
  }
  for (const variant of ["skin", "peeled"]) {
    expect(
      new Set(
        ["start", "bubbles", "colour", "rest", "cool"].map((stage) =>
          colors.get(`${stage}:${variant}`),
        ),
      ).size,
    ).toBe(5);
  }
});

test("滑桿、階段清單與花生切換更新圖和播報", async ({ page }) => {
  await page.goto("/topics/knife-skills/");
  const figure = page.locator('figure[data-topic-figure="peanut-frying"]');
  const slider = figure.getByRole("slider", { name: "炸花生時間" });
  const readout = figure.locator('[aria-live="polite"]');
  await expect(slider).toHaveValue("7");
  await expect(figure.getByText("7–12 分鐘觀察區間")).toBeVisible();
  const band = await figure.locator(".figure-band").boundingBox();
  const timeline = await slider.boundingBox();
  expect(band).not.toBeNull();
  expect(timeline).not.toBeNull();
  expect((band!.x - timeline!.x) / timeline!.width).toBeCloseTo(7 / 12, 1);
  expect(band!.width / timeline!.width).toBeCloseTo(5 / 12, 1);
  await slider.fill("2");
  await expect(readout).toContainText("小泡與蒸氣");
  await expect(figure).toHaveAttribute("data-stage", "bubbles");
  await figure.getByRole("button", { name: "跳至觀察轉色" }).click();
  await expect(slider).toHaveValue("7");
  await figure.getByRole("button", { name: "去膜" }).click();
  await expect(readout).toContainText("表面轉淡黃");
  await expect(figure).toHaveAttribute("data-variant", "peeled");
  await figure.getByText("關火餘溫", { exact: true }).click();
  await expect(slider).toHaveValue("10");
  const coolButton = figure.getByRole("button", { name: "跳至撈起放涼" });
  await coolButton.focus();
  await page.keyboard.press("Enter");
  await expect(slider).toHaveValue("12");
  await slider.focus();
  await page.keyboard.press("Home");
  await expect(slider).toHaveValue("0");
  for (let index = 0; index < 10; index++)
    await page.keyboard.press("ArrowRight");
  await expect(readout).toContainText("小泡與蒸氣");
});

test("播放可暫停、拖動接手，並在終點自動停止", async ({ page }) => {
  await page.goto("/topics/knife-skills/");
  const figure = page.locator('figure[data-topic-figure="peanut-frying"]');
  const slider = figure.getByRole("slider", { name: "炸花生時間" });
  const play = figure.getByRole("button", { name: /播放|暫停/ });
  await expect(play).toHaveText("播放");
  await play.click();
  await expect(play).toHaveText("暫停");
  await expect(slider).not.toHaveValue("7");
  await play.click();
  await expect(play).toHaveText("播放");
  const pausedAt = await slider.inputValue();
  await page.waitForTimeout(200);
  await expect(slider).toHaveValue(pausedAt);
  await slider.fill("11");
  await expect(figure).toHaveAttribute("data-stage", "rest");
  await play.click();
  await expect(figure.locator('[aria-live="polite"]')).toContainText(
    "小泡與蒸氣",
    { timeout: 2500 },
  );
  await expect(slider).toHaveValue("12", { timeout: 7500 });
  await expect(play).toHaveText("播放");
});

test("停用 JS 仍顯示關鍵圖與完整階段，控制項不出現", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/topics/knife-skills/");
  const figure = page.locator('figure[data-topic-figure="peanut-frying"]');
  await expect(figure.getByRole("img")).toBeVisible();
  await expect(figure.locator("ol li")).toHaveCount(5);
  await expect(figure.getByRole("slider")).toHaveCount(0);
  await expect(figure.getByRole("button")).toHaveCount(0);
  await context.close();
});

test("減少動態時播放逐階段跳轉", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/topics/knife-skills/");
  const figure = page.locator('figure[data-topic-figure="peanut-frying"]');
  const slider = figure.getByRole("slider", { name: "炸花生時間" });
  await figure.getByRole("button", { name: "播放" }).click();
  await expect(slider).toHaveValue("0");
  const sampledValues = await slider.evaluate(
    async (input: HTMLInputElement) => {
      const values: string[] = [];
      for (let index = 0; index < 28; index++) {
        values.push(input.value);
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      return values;
    },
  );
  expect(
    sampledValues.every((value) => ["0", "1", "7", "10", "12"].includes(value)),
  ).toBe(true);
  await expect
    .poll(async () => Number(await slider.inputValue()), { timeout: 5000 })
    .toBeGreaterThanOrEqual(7);
});

test("沒有互動圖的專題不載入執行期", async ({ page }) => {
  await page.goto("/topics/rice-basics/");
  await expect(page.locator("[data-topic-figure]")).toHaveCount(0);
  await expect(page.locator("script[data-topic-figure-runtime]")).toHaveCount(
    0,
  );
  await expect(page.locator("style[data-topic-figure-style]")).toHaveCount(0);
});
