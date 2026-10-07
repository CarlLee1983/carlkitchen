import { expect, test } from "@playwright/test";
import sharp from "sharp";

const origin = "https://carlkitchen.gravito.dev";
const image = `${origin}/meal-social.webp`;

test("公開頁面的正式建置 HTML 提供各自的摘要、正式網址與社群卡片", async ({
  page,
}) => {
  for (const [path, title, description] of [
    [
      "/",
      "煮奔",
      "煮奔提供站主審閱的繁體中文家常菜譜，從菜名、材料或分類找到今天想煮的料理。",
    ],
    [
      "/meal/?menu=sample",
      "配一桌菜｜煮奔",
      "從配菜候選中抽出或自選四菜一湯、五菜一湯，搭配今天的一桌家常菜。",
    ],
    [
      "/ingredients/",
      "食材介紹｜煮奔",
      "認識家常料理食材的選用、處理與保存，並找到相關菜譜。",
    ],
    [
      "/about/",
      "關於這個網站｜煮奔",
      "煮奔整理站主審閱的繁體中文家常菜譜，陪你把今天的飯煮出來。",
    ],
    [
      "/ingredients/tomato/",
      "番茄｜食材介紹｜煮奔",
      "固定資料食材條目，用於讀者頁測試。",
    ],
    [
      "/recipes/tomato-egg/",
      "番茄炒蛋｜煮奔",
      "蛋先炒到半熟盛起，再把番茄炒出汁，最後合在一起。蛋保持柔軟，番茄帶點湯汁，適合配飯。",
    ],
  ] as const) {
    await page.goto(path);
    const canonical = `${origin}${path.split("?")[0]}`;
    await expect(page).toHaveTitle(title);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      description,
    );
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      canonical,
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      title,
    );
    await expect(
      page.locator('meta[property="og:description"]'),
    ).toHaveAttribute("content", description);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      "content",
      canonical,
    );
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute(
      "content",
      "website",
    );
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      image,
    );
    await expect(
      page.locator('meta[property="og:image:width"]'),
    ).toHaveAttribute("content", "1200");
    await expect(
      page.locator('meta[property="og:image:height"]'),
    ).toHaveAttribute("content", "630");
    await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute(
      "content",
      "煮奔家常料理網站的配菜分享縮圖",
    );
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      "content",
      "summary_large_image",
    );
    await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute(
      "content",
      title,
    );
    await expect(
      page.locator('meta[name="twitter:description"]'),
    ).toHaveAttribute("content", description);
    await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
      "content",
      image,
    );
    await expect(
      page.locator('meta[name="twitter:image:alt"]'),
    ).toHaveAttribute("content", "煮奔家常料理網站的配菜分享縮圖");
  }
});

test("個人收藏與 404 不供搜尋收錄，社群圖片可公開讀取", async ({
  page,
  request,
}) => {
  for (const path of ["/favorites/", "/404/"]) {
    await page.goto(path);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex, follow",
    );
  }
  const response = await request.get("/meal-social.webp");
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("image/webp");
  const { width, height } = await sharp(await response.body()).metadata();
  expect({ width, height }).toEqual({ width: 1200, height: 630 });
});
