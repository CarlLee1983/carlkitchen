import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page } from "@playwright/test";

// 門檻第 8 項：WCAG 2.2 AA。axe 的標籤是累加的，所以 2.0、2.1、2.2 的 A／AA 都要列。
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

export const WIDTHS = [360, 390, 430, 1366, 1920] as const;

/** 以目前頁面狀態掃描；有違規時把規則、說明與節點列在失敗訊息裡。 */
export async function expectNoAxeViolations(page: Page, label: string) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(WCAG_TAGS)
    .analyze();
  const report = violations.map(
    (v) =>
      `${v.id}（${v.impact}）：${v.help}\n` +
      v.nodes.map((n) => `  ${n.target.join(" ")}`).join("\n"),
  );
  expect(report, `${label} 的 axe 違規`).toEqual([]);
}

/** 目前頁面狀態下不得水平捲動。 */
export async function expectNoOverflowNow(page: Page, label: string) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth, label).toBeLessThanOrEqual(clientWidth);
}

/** 各寬度下整頁不得水平捲動；每個寬度都重新載入。 */
export async function expectNoHorizontalScroll(page: Page, path: string) {
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(path);
    await expectNoOverflowNow(page, `${path} 於 ${width}px 寬`);
  }
}

/** 在每個寬度下，locator 命中的可見元素都至少 44×44（不重新載入，保留頁面狀態）。 */
export async function expectTouchTargets(page: Page, locator: Locator) {
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    const targets = await locator.all();
    expect(targets.length, `${width}px 找不到觸控目標`).toBeGreaterThan(0);
    for (const target of targets) {
      if (!(await target.isVisible())) continue;
      const box = await target.boundingBox();
      const name = await target.evaluate((el) => el.outerHTML.slice(0, 80));
      expect(box!.width, `${width}px ${name} 寬`).toBeGreaterThanOrEqual(44);
      expect(box!.height, `${width}px ${name} 高`).toBeGreaterThanOrEqual(44);
    }
  }
}

/** 只用 Tab 走到目標；走不到就失敗。 */
export async function tabTo(page: Page, target: Locator, maxTabs = 40) {
  for (let i = 0; i < maxTabs; i++) {
    if (await target.evaluate((el) => el === document.activeElement)) break;
    await page.keyboard.press("Tab");
  }
  await expect(target).toBeFocused();
}

/**
 * 斷言專案自訂的焦點樣式（global.css 的 :focus-visible：2px solid）。
 * 只看 outlineStyle !== "none" 會被 Chromium 預設的 `outline: auto` 放過，所以要求實際的 solid 與寬度。
 * 首頁菜譜列連結的焦點畫在 ::after，傳 pseudo 檢查。
 */
export async function expectFocusRing(target: Locator, pseudo?: "::after") {
  const ring = await target.evaluate((el, p) => {
    const style = getComputedStyle(el, p ?? null);
    return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
  }, pseudo);
  expect(ring.style).toBe("solid");
  expect(ring.width).toBeGreaterThanOrEqual(2);
}
