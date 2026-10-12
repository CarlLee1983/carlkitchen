import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createSatteriMarkdownProcessor } from "@astrojs/markdown-satteri";
import { topicMarkdown } from "../src/markdown/topic-markdown.ts";

const topicsDir = resolve("tests/fixtures/topics");
const renderer = await createSatteriMarkdownProcessor({
  syntaxHighlight: false,
  hastPlugins: [topicMarkdown({ topicsDir })],
});
const render = async (
  body: string,
  editorialLayout = true,
  file = `${topicsDir}/sample/topic.md`,
) =>
  (
    await renderer.render(body, {
      fileURL: pathToFileURL(file),
      frontmatter: { editorialLayout },
    })
  ).code;

describe("專題 Markdown 編排", () => {
  it("figure 區塊輸出關鍵狀態、完整階段與可索引圖說", async () => {
    const html = await render(
      "開場文字。\n\n```figure\npeanut-frying\n```",
      false,
      `${topicsDir}/knife-skills/topic.md`,
    );
    assert.match(html, /<figure[^>]*data-topic-figure="peanut-frying"/);
    assert.match(html, /<svg[^>]*role="img"[^>]*aria-label="[^"]+"/);
    assert.match(html, /<ol[^>]*data-pagefind-ignore/);
    assert.match(html, /<p class="figure-readout" data-pagefind-ignore>/);
    assert.match(html, /<div data-pagefind-ignore="all"><svg/);
    assert.match(html, /<figcaption>固定資料[^<]+<\/figcaption>/);
    assert.match(html, /data-stage="colour"/);
    assert.equal((html.match(/<li/g) ?? []).length, 5);
  });

  it("figure 缺資料、缺繪圖模組或資料不符 schema 時指出專題和圖識別值", async () => {
    await assert.rejects(
      render(
        "```figure\nmissing-figure\n```",
        false,
        `${topicsDir}/knife-skills/topic.md`,
      ),
      /專題 knife-skills 的互動圖 missing-figure 缺少資料檔/,
    );
    const root = mkdtempSync(join(tmpdir(), "topic-figure-"));
    try {
      const topic = join(root, "sample");
      const valid = resolve(
        "tests/fixtures/topics/knife-skills/peanut-frying.figure.yaml",
      );
      const { mkdirSync } = await import("node:fs");
      mkdirSync(topic);
      copyFileSync(valid, join(topic, "unknown-figure.figure.yaml"));
      const localRenderer = await createSatteriMarkdownProcessor({
        syntaxHighlight: false,
        hastPlugins: [topicMarkdown({ topicsDir: root })],
      });
      const localRender = async (id: string) =>
        localRenderer.render(`\`\`\`figure\n${id}\n\`\`\``, {
          fileURL: pathToFileURL(join(topic, "topic.md")),
          frontmatter: { editorialLayout: false },
        });
      await assert.rejects(
        localRender("unknown-figure"),
        /專題 sample 的互動圖 unknown-figure 缺少繪圖模組/,
      );
      writeFileSync(
        join(topic, "peanut-frying.figure.yaml"),
        "alt: 缺少其他欄位\n",
      );
      await assert.rejects(
        localRender("peanut-frying"),
        /專題 sample 的互動圖 peanut-frying 資料檔不符 schema/,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("一般程式碼區塊仍以 pre 顯示", async () => {
    assert.match(
      await render("```js\nconst x = 1;\n```"),
      /<pre><code class="language-js">const x = 1;/,
    );
  });

  it("只把首個頂層內文段落的首字加大，保留原文與強調、連結順序", async () => {
    const html = await render(
      "## 前言\n\n「**備菜**」先從[清洗](/ingredients/tomato/)開始。\n\n第二段不加大。",
    );
    assert.equal((html.match(/class="topic-initial"/g) ?? []).length, 1);
    assert.match(
      html,
      /<span class="topic-opening">「<\/span><strong><span class="topic-initial">備<\/span>菜<\/strong>/,
    );
    assert.match(html, /<p>第二段不加大。<\/p>/);
    assert.equal(
      html.replace(/<[^>]+>/g, "").replace(/\n/g, ""),
      "前言「備菜」先從清洗開始。第二段不加大。",
    );
  });

  it("略過圖片、引言與清單，以第一個本文段落為準", async () => {
    const html = await render(
      "![測試](./body.webp)\n\n> 引言不加大。\n\n- 清單不加大。\n\n備菜的內文。",
    );
    assert.match(html, /class="topic-initial">備<\/span>/);
    assert.equal((html.match(/class="topic-initial"/g) ?? []).length, 1);
  });

  it("第一段不是中文字時保持普通排版，不跳到下一段", async () => {
    assert.doesNotMatch(
      await render("Cooking first.\n\n備菜次之。"),
      /topic-initial/,
    );
  });

  it("支援補充漢字與多個開頭引號，不切斷字元或複製文字", async () => {
    const html = await render("「『𠮷祥』」的文字。");
    assert.match(html, /class="topic-initial">𠮷<\/span>/);
    assert.equal(html.replace(/<[^>]+>/g, "").trim(), "「『𠮷祥』」的文字。");
  });

  it("未 opt-in 的專題與專題目錄外的 Markdown 不加首字效果", async () => {
    assert.doesNotMatch(await render("備菜。", false), /topic-initial/);
    assert.equal(
      (await render("備菜。", true, resolve("content/other/topic.md"))).trim(),
      "<p>備菜。</p>",
    );
  });

  it("所有專題內文圖經 Astro 響應式流程，alt 保留但排除搜尋，不能搶 hero 優先序", async () => {
    const html = await render('![備菜插畫](./body.webp "不作圖說")', false);
    const marker = html.match(/__ASTRO_IMAGE_="([^"]+)"/)?.[1];
    assert.ok(marker);
    const attrs = JSON.parse(marker.replace(/&quot;|&#x22;/g, '"'));
    assert.equal(attrs.alt, "備菜插畫");
    assert.equal(attrs.loading, "lazy");
    assert.equal(attrs.decoding, "async");
    assert.equal(attrs.fetchpriority, "auto");
    assert.equal(attrs.layout, "constrained");
    assert.equal(attrs.sizes, "(min-width: 49rem) 46rem, calc(100vw - 3rem)");
    assert.equal(attrs["data-pagefind-ignore"], "all");
    assert.equal(attrs.priority, undefined);
    assert.doesNotMatch(html, /figcaption/);
  });

  it("非專題圖片不套用專題的圖片設定", async () => {
    const html = await render(
      "![插畫](./body.webp)",
      true,
      resolve("content/other/topic.md"),
    );
    assert.doesNotMatch(html, /data-pagefind-ignore|sizes|fetchpriority/);
  });
});
