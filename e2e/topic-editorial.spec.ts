import { expect, test, type Locator, type Page } from "@playwright/test";
import { expectNoOverflowNow } from "./a11y-helpers";

const editorialPath = "/topics/summer-salads/";
const bodyAltTerms = [
  "EditorialBodyAltCucumber",
  "EditorialBodyAltSeasoning",
  "EditorialBodyAltPreparation",
  "EditorialBodyAltTofu",
];

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Character extends Box {
  text: string;
}

/** 逐字量 Range，而不是讀取 CSS 宣告：可看見首字大小、實際換行與重疊。 */
async function measureParagraph(paragraph: Locator) {
  return paragraph.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const box = {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    };
    const characters: Character[] = [];
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      let offset = 0;
      for (const text of node.textContent ?? "") {
        const end = offset + text.length;
        if (text.trim()) {
          const range = document.createRange();
          range.setStart(node, offset);
          range.setEnd(node, end);
          const character = range.getBoundingClientRect();
          characters.push({
            text,
            x: character.x,
            y: character.y,
            width: character.width,
            height: character.height,
          });
        }
        offset = end;
      }
    }
    return { box, characters, text: element.textContent ?? "" };
  });
}

function right(box: Box) {
  return box.x + box.width;
}

function bottom(box: Box) {
  return box.y + box.height;
}

/** 同一行的字頂端允許次像素誤差；回傳畫面上的每一行，便於檢查行數與左界。 */
function renderedLines(characters: Character[]) {
  const lines: Character[][] = [];
  for (const character of characters) {
    const line = lines.find(
      (candidate) => Math.abs(candidate[0]!.y - character.y) < 2,
    );
    if (line) line.push(character);
    else lines.push([character]);
  }
  return lines.sort((a, b) => a[0]!.y - b[0]!.y);
}

function expectNoOverlap(a: Box, b: Box, label: string) {
  const overlapWidth = Math.min(right(a), right(b)) - Math.max(a.x, b.x);
  const overlapHeight = Math.min(bottom(a), bottom(b)) - Math.max(a.y, b.y);
  expect(
    overlapWidth > 1 && overlapHeight > 1,
    `${label} 不得重疊（交集 ${overlapWidth} × ${overlapHeight}）`,
  ).toBe(false);
}

function expectContained(characters: Character[], box: Box) {
  for (const character of characters) {
    expect(
      character.x,
      `「${character.text}」超出段落左界`,
    ).toBeGreaterThanOrEqual(box.x - 1);
    expect(
      right(character),
      `「${character.text}」超出段落右界`,
    ).toBeLessThanOrEqual(right(box) + 1);
  }
}

async function ready(page: Page) {
  await page.goto(editorialPath);
  await page.evaluate(() => document.fonts.ready);
}

async function expectTwoLineInitial(page: Page) {
  const paragraph = await measureParagraph(page.locator(".body p").first());
  const [quote, initial, ...rest] = paragraph.characters;
  expect(quote!.text).toBe("「");
  expect(initial!.text).toBe("天");
  expect(paragraph.text.startsWith("「天氣熱的時候，不開火也能上桌")).toBe(
    true,
  );
  expect(
    paragraph.characters.filter((character) => character.text === "「"),
  ).toHaveLength(1);

  const lines = renderedLines(rest);
  expect(
    lines.length,
    "開場至少四行，才能量到繞排之後的正常左界",
  ).toBeGreaterThanOrEqual(4);
  const linePitch = lines[1]![0]!.y - lines[0]![0]!.y;
  expect(linePitch).toBeGreaterThan(0);
  const initialBox = (await page.locator(".topic-initial").boundingBox())!;
  expect(
    initialBox.height / linePitch,
    "首字所占高度約兩行",
  ).toBeGreaterThanOrEqual(1.8);
  expect(
    initialBox.height / linePitch,
    "首字不能占到第三行",
  ).toBeLessThanOrEqual(2.2);
  expect(
    initial!.height / rest[0]!.height,
    "首字字形應明顯放大",
  ).toBeGreaterThan(2);
  expect(
    initial!.height / rest[0]!.height,
    "替代字型字形仍保持約兩行的尺度",
  ).toBeLessThanOrEqual(3.3);
  expect(initial!.width / rest[0]!.width, "只有首個中文字放大").toBeGreaterThan(
    2,
  );

  for (const [index, line] of lines.slice(0, 2).entries()) {
    expect(
      Math.min(...line.map((character) => character.x)),
      `第 ${index + 1} 行應排在首字右側`,
    ).toBeGreaterThanOrEqual(right(initial!) - 1);
  }
  for (const [index, line] of lines.slice(2).entries()) {
    expect(
      Math.abs(
        Math.min(...line.map((character) => character.x)) - paragraph.box.x,
      ),
      `第 ${index + 3} 行應回到正常左界`,
    ).toBeLessThanOrEqual(2);
  }
  for (const character of rest) {
    expect(
      Math.abs(character.height - rest[0]!.height),
      "其餘字保持內文字級",
    ).toBeLessThanOrEqual(1);
    expectNoOverlap(initial!, character, `首字與「${character.text}」`);
  }
  expect(
    Math.abs(quote!.height - rest[0]!.height),
    "開頭引號保持內文字級",
  ).toBeLessThanOrEqual(1);
  expectNoOverlap(quote!, initial!, "引號與首字");
  expect(right(quote!), "引號在首字之前").toBeLessThanOrEqual(initial!.x + 1);
  expectContained(paragraph.characters, paragraph.box);
  return paragraph;
}

async function expectOrdinaryParagraph(paragraph: Locator) {
  const measured = await measureParagraph(paragraph);
  expect(measured.characters.length).toBeGreaterThan(3);
  const [first, ...rest] = measured.characters;
  const typicalHeight = rest
    .map((character) => character.height)
    .sort((a, b) => a - b)[Math.floor(rest.length / 2)]!;
  expect(
    Math.abs(first!.height - typicalHeight),
    "段落首字應與其餘字等高",
  ).toBeLessThanOrEqual(1);
  expect(
    Math.abs(first!.y - rest[0]!.y),
    "前兩字應排在同一行",
  ).toBeLessThanOrEqual(1);
  expectNoOverlap(first!, rest[0]!, "一般段落前兩字");
  expectContained(measured.characters, measured.box);
  return measured;
}

for (const width of [651, 1366, 1920]) {
  test(`桌面 ${width}px：只有第一段的天字放大兩行，前兩行繞排且第三行回到左界`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await ready(page);
    await expectTwoLineInitial(page);
    await expectNoOverflowNow(page, `${width}px 桌面首字繞排`);
  });
}

for (const width of [320, 390, 650]) {
  test(`手機 ${width}px：開頭引號與首字回到一般字級及同一行`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await ready(page);
    const paragraph = await expectOrdinaryParagraph(
      page.locator(".body p").first(),
    );
    const [quote, initial, next] = paragraph.characters;
    expect(quote!.text).toBe("「");
    expect(initial!.text).toBe("天");
    expect(Math.abs(initial!.height - next!.height)).toBeLessThanOrEqual(1);
    expect(Math.abs(initial!.y - next!.y)).toBeLessThanOrEqual(1);
    expectNoOverlap(quote!, initial!, "手機引號與首字");
    expectNoOverlap(initial!, next!, "手機首字與第二字");
    const lines = renderedLines(paragraph.characters);
    expect(lines.length).toBeGreaterThan(3);
    expect(Math.abs(lines[1]![0]!.x - paragraph.box.x)).toBeLessThanOrEqual(2);
    expect(
      paragraph.characters.filter((character) => character.text === "「"),
    ).toHaveLength(1);
    await expectNoOverflowNow(page, `${width}px 手機普通段落`);
  });
}

test("摘要、其他段落及未啟用版面的專題不會出現放大首字", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 1000 });
  await ready(page);
  await expectOrdinaryParagraph(page.locator(".lead"));
  const paragraphs = page
    .locator(".body p")
    .filter({ hasText: /[\p{Script=Han}]/u });
  expect(await paragraphs.count()).toBe(4);
  for (const paragraph of (await paragraphs.all()).slice(1)) {
    await expectOrdinaryParagraph(paragraph);
  }

  await page.goto("/topics/rice-basics/");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "煮飯的基本功",
  );
  await expectOrdinaryParagraph(page.locator(".lead"));
  for (const paragraph of await page.locator(".body p").all()) {
    await expectOrdinaryParagraph(paragraph);
  }
  await expectNoOverflowNow(page, "未啟用版面的煮飯專題");
});

test("缺少指定字型時，系統替代字型仍有兩行繞排而不重疊", async ({ page }) => {
  await page.route(/\.(?:woff2?|otf|ttf)(?:\?|$)/i, (route) => route.abort());
  await page.setViewportSize({ width: 1366, height: 1000 });
  await ready(page);
  await page.addStyleTag({
    content:
      ':root { --font-serif: "Unavailable Editorial Font", serif; --font-sans: "Unavailable Editorial Font", sans-serif; }',
  });
  await page.evaluate(() => document.fonts.ready);
  await expectTwoLineInitial(page);
  await expectNoOverflowNow(page, "替代字型");
});

test("文字放大 200% 仍可繞排，400% 縮放等效窄視窗仍完整重排", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 1000 });
  await ready(page);
  const before = await measureParagraph(page.locator(".body p").first());
  await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
  const enlarged = await expectTwoLineInitial(page);
  expect(
    enlarged.characters[2]!.height / before.characters[2]!.height,
  ).toBeGreaterThan(1.8);
  await expectNoOverflowNow(page, "200% 文字放大");

  // 1280px 視窗在 400% 縮放下只剩 320 CSS px：量重排結果，不以視覺縮放假裝重排。
  await page.setViewportSize({ width: 320, height: 900 });
  await ready(page);
  await expectOrdinaryParagraph(page.locator(".body p").first());
  await expectNoOverflowNow(page, "400% 縮放等效的 320 CSS px 視窗");
});

for (const width of [390, 1366]) {
  test(`${width}px 內文四張插圖提供響應式圖片、保留比例且只讓封面優先載入`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await ready(page);
    const images = page.locator(".body").getByRole("img");
    await expect(images).toHaveCount(4);
    const hero = page
      .getByRole("main")
      .getByRole("img", { name: "固定資料專題的測試封面" });
    await expect(hero).toHaveAttribute("fetchpriority", "high");
    await expect(hero).toHaveAttribute("loading", "eager");
    await expect(page.locator('main img[fetchpriority="high"]')).toHaveCount(1);

    let previousBottom = 0;
    for (const [index, image] of (await images.all()).entries()) {
      await expect(image).toHaveAttribute(
        "alt",
        new RegExp(bodyAltTerms[index]!),
      );
      await expect(image).toHaveAttribute("loading", "lazy");
      await expect(image).not.toHaveAttribute("fetchpriority", "high");
      const srcset = await image.getAttribute("srcset");
      expect(srcset).toBeTruthy();
      const candidates = srcset!
        .split(",")
        .map((candidate) => candidate.trim());
      expect(candidates.length).toBeGreaterThan(1);
      for (const candidate of candidates) expect(candidate).toMatch(/\s\d+w$/);
      expect(
        (await image.getAttribute("sizes"))?.trim().length,
      ).toBeGreaterThan(0);
      const intrinsicWidth = Number(await image.getAttribute("width"));
      const intrinsicHeight = Number(await image.getAttribute("height"));
      expect(intrinsicWidth).toBeGreaterThan(0);
      expect(intrinsicHeight).toBeGreaterThan(0);
      expect(intrinsicWidth / intrinsicHeight).toBeCloseTo(1.5, 2);
      await image.scrollIntoViewIfNeeded();
      await expect
        .poll(() =>
          image.evaluate(
            (element: HTMLImageElement) =>
              element.complete && element.naturalWidth > 0,
          ),
        )
        .toBe(true);
      const box = (await image.boundingBox())!;
      const body = (await page.locator(".body").boundingBox())!;
      expect(box.width).toBeGreaterThan(0);
      expect(box.width / box.height).toBeCloseTo(1.5, 2);
      expect(box.x).toBeGreaterThanOrEqual(body.x - 1);
      expect(right(box)).toBeLessThanOrEqual(right(body) + 1);
      const documentTop = box.y + (await page.evaluate(() => window.scrollY));
      expect(documentTop).toBeGreaterThanOrEqual(previousBottom);
      previousBottom = documentTop + box.height;
    }
    await expectNoOverflowNow(page, `${width}px 內文圖片`);
  });
}

test("內文圖片的替代文字不進 Pagefind，原有開場文字仍能搜尋", async ({
  page,
}) => {
  await page.goto("/");
  const indexedAltTerms = await page.evaluate(async (terms) => {
    const moduleUrl = "/pagefind/pagefind.js";
    const pagefind = await import(/* @vite-ignore */ moduleUrl);
    return Promise.all(
      terms.map(async (term) => ({
        term,
        count: (await pagefind.search(term)).results.length as number,
      })),
    );
  }, bodyAltTerms);
  for (const result of indexedAltTerms) {
    expect(result.count, `Pagefind 本身不得收錄「${result.term}」`).toBe(0);
  }
  const searchbox = page.getByRole("searchbox");
  const status = page.getByRole("status");
  const rows = page
    .getByRole("region", { name: "菜譜清單" })
    .getByRole("listitem");
  for (const term of bodyAltTerms) {
    await searchbox.fill(term);
    await expect(status).toContainText(`「${term}」符合`);
    await expect(rows, `圖片替代文字「${term}」不能成為搜尋結果`).toHaveCount(
      0,
    );
  }
  const term = "不開火也能上桌";
  await searchbox.fill(term);
  await expect(status).toContainText(`「${term}」符合`);
  await expect(
    rows.getByRole("link", { name: "夏天的涼拌菜", exact: true }),
  ).toBeVisible();
});
