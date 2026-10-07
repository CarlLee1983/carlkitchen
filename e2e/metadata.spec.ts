import { expect, test } from "@playwright/test";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
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

test("不同菜譜的正式社群卡片各自使用完整成品圖與頁面文案", async ({
  page,
  request,
}) => {
  const hashes = new Set<string>();
  for (const [id, title, description, alt] of [
    [
      "tomato-egg",
      "番茄炒蛋",
      "蛋先炒到半熟盛起，再把番茄炒出汁，最後合在一起。蛋保持柔軟，番茄帶點湯汁，適合配飯。",
      "白瓷盤中盛著番茄炒蛋，旁邊放著一雙筷子",
    ],
    [
      "egg-drop-soup",
      "蛋花湯",
      "水滾後淋入蛋液，輕推成蛋花，鹽調味，幾分鐘就能上桌的清爽湯品。",
      "白瓷碗中盛著蛋花湯，旁邊放著一支湯匙",
    ],
  ] as const) {
    await page.goto(`/recipes/${id}/`);
    const imageUrl = `${origin}/recipes/${id}/social.webp`;
    await expect(page).toHaveTitle(`${title}｜煮奔`);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `${origin}/recipes/${id}/`,
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      `${title}｜煮奔`,
    );
    await expect(
      page.locator('meta[property="og:description"]'),
    ).toHaveAttribute("content", description);
    await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute(
      "content",
      `${title}｜煮奔`,
    );
    await expect(
      page.locator('meta[name="twitter:description"]'),
    ).toHaveAttribute("content", description);
    for (const selector of [
      'meta[property="og:image"]',
      'meta[name="twitter:image"]',
    ]) {
      await expect(page.locator(selector)).toHaveAttribute("content", imageUrl);
    }
    for (const selector of [
      'meta[property="og:image:alt"]',
      'meta[name="twitter:image:alt"]',
    ]) {
      await expect(page.locator(selector)).toHaveAttribute("content", alt);
    }
    await expect(
      page.locator('meta[property="og:image:width"]'),
    ).toHaveAttribute("content", "1200");
    await expect(
      page.locator('meta[property="og:image:height"]'),
    ).toHaveAttribute("content", "630");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    await expect(page.locator(".summary")).toHaveText(description);
    await expect(
      page.getByRole("article").getByRole("img").first(),
    ).toHaveAttribute("alt", alt);

    const response = await request.get(`/recipes/${id}/social.webp`);
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("image/webp");
    const bytes = await response.body();
    const metadata = await sharp(bytes).metadata();
    expect([metadata.width, metadata.height]).toEqual([1200, 630]);
    // 中央 945×630 應包含 3:2 原圖全貌；若改成滿版裁切，像素會與原圖顯著不同。
    const source = await sharp(
      await readFile(`tests/fixtures/recipes/${id}/hero.webp`),
    )
      .resize(945, 630)
      .raw()
      .toBuffer();
    const cardCenter = await sharp(bytes)
      .extract({ left: 127, top: 0, width: 945, height: 630 })
      .raw()
      .toBuffer();
    const meanDifference =
      source.reduce(
        (sum, value, index) => sum + Math.abs(value - cardCenter[index]!),
        0,
      ) / source.length;
    expect(meanDifference).toBeLessThan(8);
    hashes.add(createHash("sha256").update(bytes).digest("hex"));
  }
  expect(hashes.size).toBe(2);
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

test("菜譜結構化資料與讀者看到的材料和做法一致", async ({ page }) => {
  await page.goto("/recipes/tomato-egg/");
  const scripts = page.locator('script[type="application/ld+json"]');
  await expect(scripts).toHaveCount(1);
  const recipe = JSON.parse((await scripts.textContent()) ?? "") as Record<
    string,
    unknown
  >;
  expect(recipe["@context"]).toBe("https://schema.org");
  expect(recipe["@type"]).toBe("Recipe");
  expect(recipe.name).toBe(
    await page.getByRole("heading", { level: 1 }).textContent(),
  );
  expect(recipe.description).toBe(await page.locator(".summary").textContent());
  expect(recipe.image).toBe(`${origin}/recipes/tomato-egg/social.webp`);
  expect(recipe.recipeYield).toBe("2 人份");
  expect(recipe.totalTime).toBe("PT15M");
  const ingredients = await page.locator(".ingredients li").allTextContents();
  expect(recipe.recipeIngredient).toEqual(
    ingredients.map((item) => item.trim().replace(/\s+/g, " ")),
  );
  const steps = await page.locator(".steps > li > p").allTextContents();
  expect(recipe.recipeInstructions).toEqual(
    steps.map((text) => ({ "@type": "HowToStep", text })),
  );
  for (const key of [
    "aggregateRating",
    "review",
    "datePublished",
    "prepTime",
    "cookTime",
  ]) {
    expect(recipe).not.toHaveProperty(key);
  }
  await page.goto("/ingredients/tomato/");
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(
    0,
  );
});

test("sitemap 僅列適合收錄的正式公開頁面，robots 指向清單", async ({
  request,
}) => {
  const robots = await request.get("/robots.txt");
  expect(robots.ok()).toBe(true);
  expect(await robots.text()).toContain(`Sitemap: ${origin}/sitemap-index.xml`);
  const index = await request.get("/sitemap-index.xml");
  expect(index.ok()).toBe(true);
  const names = [...(await index.text()).matchAll(/<loc>(.*?)<\/loc>/g)].map(
    (match) => match[1]!,
  );
  expect(names.length).toBeGreaterThan(0);
  const urls = (
    await Promise.all(
      names.map(
        async (name) =>
          await (await request.get(new URL(name).pathname)).text(),
      ),
    )
  ).flatMap((xml) =>
    [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]!),
  );
  expect(urls).toEqual(
    expect.arrayContaining([
      `${origin}/`,
      `${origin}/about/`,
      `${origin}/meal/`,
      `${origin}/ingredients/`,
      `${origin}/ingredients/tomato/`,
      `${origin}/recipes/tomato-egg/`,
      `${origin}/topics/`,
      `${origin}/topics/summer-salads/`,
    ]),
  );
  expect(
    urls.every((url) => url.startsWith(origin) && !url.includes("?")),
  ).toBe(true);
  expect(
    urls.some((url) =>
      /favorites|404|draft-sample|draft-topic|social\.webp/.test(url),
    ),
  ).toBe(false);
  expect(urls.length).toBe(new Set(urls).size);
});
