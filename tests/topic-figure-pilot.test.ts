import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { it } from "node:test";
import { createSatteriMarkdownProcessor } from "@astrojs/markdown-satteri";
import { chromium } from "@playwright/test";
import { topicMarkdown } from "../src/markdown/topic-markdown.ts";

it("已發布的熱鍋專題在原有插畫旁顯示有來源的炸花生互動圖", async () => {
  const topicsDir = resolve("content/topics");
  const topicFile = resolve(topicsDir, "wok-heat-and-oil/topic.md");
  const markdown = readFileSync(topicFile, "utf8").replace(
    /^---\n[\s\S]*?\n---\n/,
    "",
  );
  const renderer = await createSatteriMarkdownProcessor({
    syntaxHighlight: false,
    hastPlugins: [topicMarkdown({ topicsDir })],
  });
  const html = (
    await renderer.render(markdown, {
      fileURL: pathToFileURL(topicFile),
      frontmatter: { editorialLayout: true },
    })
  ).code;

  assert.match(html, /peanuts-in-cold-oil\.webp/);
  const figure = html.match(
    /<figure class="topic-figure[\s\S]*?<\/figure>/,
  )?.[0];
  assert.ok(figure);
  assert.match(figure, /data-topic-figure="peanut-frying"/);
  assert.match(figure, /<svg[^>]*role="img"[^>]*aria-label="[^"]*炒鍋[^"]*"/);
  assert.match(figure, /帶膜花生的薄膜轉深紅褐/);
  assert.match(figure, /表面淡黃就撈起/);
  assert.match(figure, /7–12 分鐘觀察區間/);
  assert.match(figure, /小泡與蒸氣<\/strong>（加熱時）/);
  assert.match(figure, /關火餘溫<\/strong>（最後 1 到 2 分鐘）/);
  assert.doesNotMatch(figure, /1–6 分鐘|10–12 分鐘/);
  assert.match(figure, /其他階段在滑桿上的位置僅供切換畫面/);
  assert.match(figure, /帶膜花生的炸製過程/);
  assert.match(figure, /去膜花生先用中火加熱/);
  assert.doesNotMatch(figure, /aria-label="[^"]*紅色薄膜/);
  assert.doesNotMatch(figure, /(?:°C|℃)/);
});

it("去膜比較只顯示熟度線索，帶膜時間軸可切回", async () => {
  const data = readFileSync(
    resolve("content/topics/wok-heat-and-oil/peanut-frying.figure.yaml"),
    "utf8",
  );
  const { parse } = await import("yaml");
  const { figureSchema } = await import("../src/content/figure-schema.ts");
  const { renderPeanutFrying } =
    await import("../src/figures/peanut-frying.ts");
  const html = renderPeanutFrying(figureSchema.parse(parse(data)));
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(html);
    const figure = page.locator("figure[data-topic-figure]");
    assert.equal(await figure.getByRole("slider").count(), 0);
    assert.match(
      await figure.locator(".figure-comparison").innerText(),
      /去膜花生先用中火加熱/,
    );
    assert.doesNotMatch(
      await figure.locator("ol").innerText(),
      /去膜花生先用中火加熱/,
    );
    await page.addScriptTag({
      path: resolve("public/scripts/topic-figure.js"),
    });
    await figure.getByRole("button", { name: "去膜" }).click();
    assert.equal(await figure.getByRole("slider").count(), 0);
    assert.equal(await figure.getByRole("button", { name: "播放" }).count(), 0);
    assert.equal(await figure.locator("ol:visible").count(), 0);
    assert.match(
      await figure.locator('[aria-live="polite"]').innerText(),
      /去膜花生先用中火加熱/,
    );
    await figure.getByRole("button", { name: "帶膜" }).click();
    assert.equal(await figure.getByRole("slider").count(), 1);
    assert.equal(await figure.getByRole("button", { name: "播放" }).count(), 1);
    assert.equal(await figure.locator("ol:visible").count(), 1);
  } finally {
    await browser.close();
  }
});
