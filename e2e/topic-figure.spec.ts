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
  await expect(figure.getByText("觀察轉色")).toBeVisible();
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
