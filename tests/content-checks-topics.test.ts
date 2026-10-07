import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import {
  copyFileSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { runContentChecks } from "../src/content-checks/run.ts";

const fixtures = fileURLToPath(
  new URL("./fixtures/content-checks/valid", import.meta.url),
);
const sourceUrl = "https://example.com/approved-source";
const sourceRecord = `sources:
  - title: 核准來源
    url: ${sourceUrl}
sections:
  - heading: 涼拌小黃瓜
    urls:
      - ${sourceUrl}
`;
const workDirs: string[] = [];

const ingredient = (draft: boolean) => `title: 高麗菜
summary: 臺灣常見的葉菜。
category: seasoning
draft: ${draft}
selection: 看外觀。
preparation: 洗淨。
storage: 冷藏。
uses: 清炒。
relatedRecipes:
  - alpha
`;

const topic = (related: { recipes: string[]; ingredients: string[] }) => `---
title: 夏天的涼拌菜
summary: 三種涼拌做法。
draft: false
publishedAt: 2026-09-01
hero:
  src: hero.webp
  alt: 涼拌菜成品
relatedRecipes: [${related.recipes.join(", ")}]
relatedIngredients: [${related.ingredients.join(", ")}]
references: []
---

內文。

## 涼拌小黃瓜

做法。
`;

function scenario() {
  const root = mkdtempSync(join(tmpdir(), "topic-checks-"));
  workDirs.push(root);
  cpSync(fixtures, root, { recursive: true });
  const write = (path: string, content: string) => {
    mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(path, content);
  };
  write(join(root, "ingredients/cabbage/ingredient.yaml"), ingredient(false));
  write(join(root, "ingredients/garlic/ingredient.yaml"), ingredient(true));
  const file = join(root, "topics/summer-salads/topic.md");
  write(file, topic({ recipes: ["alpha"], ingredients: ["cabbage"] }));
  mkdirSync(join(root, "topics/summer-salads"), { recursive: true });
  copyFileSync(
    join(root, "recipes/alpha/hero.webp"),
    join(root, "topics/summer-salads/hero.webp"),
  );
  const sourceFile = join(root, "topic-sources/summer-salads.yaml");
  write(sourceFile, sourceRecord);
  return {
    root,
    file,
    sourceFile,
    hero: join(root, "topics/summer-salads/hero.webp"),
    write,
    options: {
      recipesDir: join(root, "recipes"),
      sourcesDir: join(root, "sources"),
      ingredientsDir: join(root, "ingredients"),
      topicsDir: join(root, "topics"),
      topicSourcesDir: join(root, "topic-sources"),
      distDir: join(root, "dist"),
      launch: false,
    },
  };
}

after(() => {
  for (const dir of workDirs) rmSync(dir, { recursive: true, force: true });
});

describe("專題內容檢查", () => {
  describe("Markdown 內文圖片", () => {
    const withImages = (s: ReturnType<typeof scenario>, body: string) =>
      s.write(s.file, topic({ recipes: [], ingredients: [] }) + body);

    it("接受相對路徑與參照式圖片，步驟圖的替代文字可以有餐具", async () => {
      const s = scenario();
      withImages(
        s,
        '\n![用湯匙拌勻](./hero.webp)\n\n![備菜圖][prep]\n\n[prep]: hero.webp "備菜"\n',
      );
      assert.deepEqual(await runContentChecks(s.options), []);
    });

    it("一般與參照式圖片都要有非空白替代文字", async () => {
      const s = scenario();
      withImages(s, "\n![](hero.webp)\n\n![  ][prep]\n\n[prep]: hero.webp\n");
      const issues = await runContentChecks(s.options);
      assert.equal(issues.length, 2);
      assert.ok(
        issues.every(
          (issue) =>
            /替代文字/.test(issue.message) && issue.topic === "summer-salads",
        ),
      );
    });

    it("不存在的本地圖片須指出圖片與內文欄位", async () => {
      const s = scenario();
      withImages(s, "\n![備菜](missing.webp)\n");
      const issues = await runContentChecks(s.options);
      assert.ok(
        issues.some(
          (issue) =>
            issue.file === "missing.webp" &&
            issue.field === "body.images.0" &&
            /找不到/.test(issue.message),
        ),
      );
    });

    it("逐張檢查內文圖片的格式、尺寸與 300 KB 上限", async () => {
      const s = scenario();
      const invalid = join(s.root, "topics/summer-salads/invalid.png");
      await sharp(randomBytes(160 * 100 * 3), {
        raw: { width: 160, height: 100, channels: 3 },
      })
        .png()
        .toFile(invalid);
      withImages(s, "\n![備菜](invalid.png)\n");
      let issues = await runContentChecks(s.options);
      assert.ok(issues.some((issue) => /WebP/.test(issue.message)));
      assert.ok(issues.some((issue) => /1536×1024/.test(issue.message)));
      const huge = join(s.root, "topics/summer-salads/huge.webp");
      await sharp(randomBytes(1536 * 1024 * 3), {
        raw: { width: 1536, height: 1024, channels: 3 },
      })
        .webp({ lossless: true })
        .toFile(huge);
      withImages(s, "\n![備菜](huge.webp)\n");
      issues = await runContentChecks(s.options);
      assert.ok(issues.some((issue) => /300 KB/.test(issue.message)));
    });

    it("禁止遠端、絕對與跨資料夾的內文圖片，無法繞過在地規格檢查", async () => {
      const s = scenario();
      for (const src of [
        "https://example.com/a.webp",
        "/images/a.webp",
        "../other/a.webp",
        "./%2e%2e/other/a.webp",
        "hero.webp?raw",
      ]) {
        withImages(s, `\n![備菜](${src})\n`);
        const issues = await runContentChecks(s.options);
        assert.ok(
          issues.some((issue) => /同一資料夾/.test(issue.message)),
          src,
        );
      }
    });

    it("HTML img 也會被阻擋，要求使用可最佳化的 Markdown 圖片", async () => {
      const s = scenario();
      withImages(s, '\n<img src="hero.webp" alt="備菜">\n');
      const issues = await runContentChecks(s.options);
      assert.ok(issues.some((issue) => /Markdown/.test(issue.message)));
    });

    it("程式碼範例與跳脫符號不當成圖片；草稿不強制圖片規格", async () => {
      const s = scenario();
      withImages(
        s,
        '\n`![](missing.webp)`\n\n```\n![](missing.webp)\n<img src="missing.webp">\n```\n\n\\![普通文字](missing.webp)\n',
      );
      assert.deepEqual(await runContentChecks(s.options), []);
      s.write(
        s.file,
        topic({ recipes: [], ingredients: [] }).replace(
          "draft: false",
          "draft: true",
        ) + "\n![](missing.webp)\n",
      );
      assert.deepEqual(await runContentChecks(s.options), []);
    });
  });
  it("相關連結都指向已發布的菜譜與食材條目時通過", async () => {
    assert.deepEqual(await runContentChecks(scenario().options), []);
  });

  it("已發布專題連到草稿菜譜時阻擋，指出專題與欄位", async () => {
    const s = scenario();
    s.write(s.file, topic({ recipes: ["beta-draft"], ingredients: [] }));
    const issues = await runContentChecks(s.options);
    assert.ok(
      issues.some(
        (issue) => issue.file === s.file && issue.field === "relatedRecipes.0",
      ),
    );
  });

  it("已發布專題連到不存在的菜譜或食材條目時阻擋", async () => {
    const s = scenario();
    s.write(
      s.file,
      topic({ recipes: ["alpha", "typo"], ingredients: ["nope"] }),
    );
    const fields = (await runContentChecks(s.options)).map(
      (issue) => issue.field,
    );
    assert.deepEqual(fields.sort(), [
      "relatedIngredients.0",
      "relatedRecipes.1",
    ]);
  });

  it("已發布專題連到草稿食材條目時阻擋", async () => {
    const s = scenario();
    s.write(s.file, topic({ recipes: [], ingredients: ["garlic"] }));
    const issues = await runContentChecks(s.options);
    assert.ok(issues.some((issue) => issue.field === "relatedIngredients.0"));
  });

  it("草稿專題不受相關連結限制", async () => {
    const s = scenario();
    s.write(
      s.file,
      topic({
        recipes: ["beta-draft", "typo"],
        ingredients: ["garlic"],
      }).replace("draft: false", "draft: true"),
    );
    assert.deepEqual(await runContentChecks(s.options), []);
  });

  it("已發布專題缺封面時阻擋", async () => {
    const s = scenario();
    s.write(
      s.file,
      topic({ recipes: [], ingredients: [] }).replace(
        /hero:\n {2}src: hero.webp\n {2}alt: 涼拌菜成品\n/,
        "",
      ),
    );
    const issues = await runContentChecks(s.options);
    assert.ok(issues.some((issue) => issue.field === "hero"));
  });

  it("frontmatter 缺失或無法解析時阻擋", async () => {
    const s = scenario();
    s.write(s.file, "沒有 frontmatter 的內文。\n");
    const issues = await runContentChecks(s.options);
    assert.ok(issues.some((issue) => issue.file === s.file));
  });

  it("已發布專題缺來源紀錄時阻擋，草稿不受限", async () => {
    const s = scenario();
    rmSync(s.sourceFile);
    const issues = await runContentChecks(s.options);
    assert.ok(
      issues.some(
        (issue) =>
          issue.topic === "summer-salads" && /來源紀錄/.test(issue.message),
      ),
    );
    s.write(
      s.file,
      topic({ recipes: [], ingredients: [] }).replace(
        "draft: false",
        "draft: true",
      ),
    );
    assert.deepEqual(await runContentChecks(s.options), []);
  });

  it("來源紀錄沒有核准來源時阻擋", async () => {
    const s = scenario();
    s.write(s.sourceFile, "sources: []\nsections: []\n");
    const issues = await runContentChecks(s.options);
    assert.ok(
      issues.some(
        (issue) => issue.file === s.sourceFile && issue.field === "sources",
      ),
    );
  });

  it("段落對照的網址不在 sources 裡時阻擋", async () => {
    const s = scenario();
    s.write(
      s.sourceFile,
      sourceRecord.replace(
        `      - ${sourceUrl}\n`,
        `      - ${sourceUrl}\n      - https://example.com/unlisted\n`,
      ),
    );
    const issues = await runContentChecks(s.options);
    assert.ok(
      issues.some(
        (issue) =>
          issue.file === s.sourceFile &&
          /sections\.0\.urls\.1/.test(issue.field ?? ""),
      ),
    );
  });

  it("段落對照的小節標題不是內文的 ## 或 ### 標題時阻擋", async () => {
    const s = scenario();
    s.write(
      s.sourceFile,
      sourceRecord.replace("heading: 涼拌小黃瓜", "heading: 涼拌豆腐"),
    );
    const issues = await runContentChecks(s.options);
    assert.ok(
      issues.some(
        (issue) =>
          issue.file === s.sourceFile && /涼拌豆腐/.test(issue.message),
      ),
    );
  });

  it("來源紀錄沒有對應專題時視為孤兒", async () => {
    const s = scenario();
    s.write(join(s.root, "topic-sources/ghost.yaml"), sourceRecord);
    const issues = await runContentChecks(s.options);
    assert.ok(issues.some((issue) => /孤兒/.test(issue.message)));
  });

  it("封面圖不是 WebP 時阻擋", async () => {
    const s = scenario();
    writeFileSync(s.hero, "not an image");
    const issues = await runContentChecks(s.options);
    assert.ok(
      issues.some(
        (issue) =>
          issue.topic === "summer-salads" &&
          issue.field === "hero" &&
          /WebP/.test(issue.message),
      ),
    );
  });

  it("封面圖尺寸不是 1536×1024 時阻擋", async () => {
    const s = scenario();
    await sharp({
      create: { width: 100, height: 100, channels: 3, background: "#fff" },
    })
      .webp()
      .toFile(s.hero);
    const issues = await runContentChecks(s.options);
    assert.ok(
      issues.some(
        (issue) => issue.field === "hero" && /1536/.test(issue.message),
      ),
    );
  });

  it("封面圖超過 300 KB 時阻擋", async () => {
    const s = scenario();
    const noise = randomBytes(1536 * 1024 * 3);
    await sharp(noise, { raw: { width: 1536, height: 1024, channels: 3 } })
      .webp({ quality: 100, lossless: true })
      .toFile(s.hero);
    const issues = await runContentChecks(s.options);
    assert.ok(
      issues.some(
        (issue) => issue.field === "hero" && /300 KB/.test(issue.message),
      ),
    );
  });

  it("封面替代文字提到餐具時阻擋", async () => {
    const s = scenario();
    s.write(
      s.file,
      topic({ recipes: [], ingredients: [] }).replace(
        "涼拌菜成品",
        "筷子夾起涼拌菜",
      ),
    );
    const issues = await runContentChecks(s.options);
    assert.ok(
      issues.some(
        (issue) => issue.field === "hero" && /餐具/.test(issue.message),
      ),
    );
  });

  it("草稿專題出現在建置輸出時阻擋", async () => {
    const s = scenario();
    s.write(
      s.file,
      topic({ recipes: [], ingredients: [] }).replace(
        "draft: false",
        "draft: true",
      ),
    );
    s.write(
      join(s.root, "dist/topics/summer-salads/index.html"),
      "<p>草稿</p>",
    );
    const issues = await runContentChecks(s.options);
    assert.ok(
      issues.some(
        (issue) =>
          issue.topic === "summer-salads" && /草稿/.test(issue.message),
      ),
    );
  });

  it("核准來源網址出現在建置輸出時阻擋", async () => {
    const s = scenario();
    s.write(
      join(s.root, "dist/topics/summer-salads/index.html"),
      `<a href="${sourceUrl}">來源</a>`,
    );
    const issues = await runContentChecks(s.options);
    assert.ok(issues.some((issue) => /內部來源網址/.test(issue.message)));
  });

  it("選題參考網址會公開顯示，不得同時是核准來源", async () => {
    const s = scenario();
    s.write(
      s.file,
      topic({ recipes: [], ingredients: [] }).replace(
        "references: []",
        `references:\n  - author: 某人\n    title: 某文\n    url: ${sourceUrl}`,
      ),
    );
    const issues = await runContentChecks(s.options);
    assert.ok(issues.some((issue) => issue.field === "references.0.url"));
  });

  it("選題參考網址不同於核准來源時，出現在建置輸出不算洩漏", async () => {
    const s = scenario();
    const reference = "https://example.com/reference-article";
    s.write(
      s.file,
      topic({ recipes: [], ingredients: [] }).replace(
        "references: []",
        `references:\n  - author: 某人\n    title: 某文\n    url: ${reference}`,
      ),
    );
    s.write(
      join(s.root, "dist/topics/summer-salads/index.html"),
      `<a href="${reference}">參考</a>`,
    );
    assert.deepEqual(await runContentChecks(s.options), []);
  });

  it("候選池門檻不受專題影響", async () => {
    const s = scenario();
    const withTopics = await runContentChecks({ ...s.options, launch: true });
    const without = await runContentChecks({
      ...s.options,
      topicsDir: undefined,
      topicSourcesDir: undefined,
      launch: true,
    });
    assert.deepEqual(withTopics, without);
    assert.ok(without.length > 0);
  });

  it("只提供 topicsDir 或 topicSourcesDir 其中一個時報設定錯誤，不靜默略過", async () => {
    const s = scenario();
    for (const omitted of ["topicsDir", "topicSourcesDir"] as const) {
      const issues = await runContentChecks({
        ...s.options,
        [omitted]: undefined,
      });
      assert.ok(issues.some((issue) => /設定不完整/.test(issue.message)));
    }
  });

  it("已發布專題內文的每個 ## 小節都要出現在段落對照", async () => {
    const s = scenario();
    s.write(
      s.file,
      topic({ recipes: [], ingredients: [] }).replace(
        "\n做法。",
        "\n做法。\n\n## 涼拌豆腐\n\n更多。",
      ),
    );
    const issues = await runContentChecks(s.options);
    assert.ok(
      issues.some(
        (issue) =>
          issue.topic === "summer-salads" &&
          issue.field === "sections" &&
          /涼拌豆腐/.test(issue.message),
      ),
    );
  });

  it("### 小節不強制列入段落對照，草稿不要求來源紀錄內容", async () => {
    const s = scenario();
    s.write(
      s.file,
      topic({ recipes: [], ingredients: [] }).replace(
        "\n做法。",
        "\n做法。\n\n### 小技巧\n\n說明。",
      ),
    );
    assert.deepEqual(await runContentChecks(s.options), []);
    s.write(
      s.file,
      topic({ recipes: [], ingredients: [] })
        .replace("draft: false", "draft: true")
        .replace("\n做法。", "\n做法。\n\n## 未對照\n\n說明。"),
    );
    s.write(s.sourceFile, "sources: []\nsections: []\n");
    assert.deepEqual(await runContentChecks(s.options), []);
  });

  it("程式碼區塊內的 ## 不算標題；收尾 fence 須同字元且不短於開頭", async () => {
    const s = scenario();
    s.write(
      s.file,
      topic({ recipes: [], ingredients: [] }).replace(
        "\n做法。",
        "\n做法。\n\n````\n```\n## 區塊內假標題\n````\n\n## 區塊後真標題\n",
      ),
    );
    const issues = await runContentChecks(s.options);
    const messages = issues.map((issue) => issue.message).join("\n");
    assert.doesNotMatch(messages, /區塊內假標題/);
    assert.match(messages, /區塊後真標題/);
    assert.equal(issues.length, 1, messages);
  });

  describe("內文站內連結", () => {
    const withBody = (s: ReturnType<typeof scenario>, extra: string) =>
      s.write(
        s.file,
        topic({ recipes: [], ingredients: [] }).replace(
          "\n做法。",
          `\n做法。\n\n${extra}\n`,
        ),
      );

    it("指向已發布的菜譜、食材條目與專題時通過", async () => {
      const s = scenario();
      s.write(
        join(s.root, "topics/other/topic.md"),
        topic({ recipes: [], ingredients: [] }).replace(
          "\n## 涼拌小黃瓜\n\n做法。",
          "",
        ),
      );
      copyFileSync(s.hero, join(s.root, "topics/other/hero.webp"));
      s.write(
        join(s.root, "topic-sources/other.yaml"),
        "sources:\n  - title: 來源\n    url: https://example.com/other\nsections: []\n",
      );
      withBody(
        s,
        "[菜](/recipes/alpha/) [食材](/ingredients/cabbage/) [專題](/topics/other/) [列表](/topics/) [錨點](/recipes/alpha/#steps)",
      );
      assert.deepEqual(await runContentChecks(s.options), []);
    });

    it("連到草稿或不存在的頁面時阻擋，訊息指出連結", async () => {
      const s = scenario();
      withBody(
        s,
        "[a](/recipes/beta-draft/) [b](/ingredients/garlic/) [c](/topics/nope/) [d](/recipes/typo/)",
      );
      const issues = (await runContentChecks(s.options)).filter(
        (issue) => issue.field === "body",
      );
      assert.equal(issues.length, 4);
      for (const link of [
        "/recipes/beta-draft/",
        "/ingredients/garlic/",
        "/topics/nope/",
        "/recipes/typo/",
      ]) {
        assert.ok(
          issues.some((issue) => issue.message.includes(link)),
          link,
        );
      }
    });

    it("HTML href 也檢查，程式碼區塊與行內程式碼中的連結不算", async () => {
      const s = scenario();
      withBody(
        s,
        '<a href="/recipes/typo/">x</a>\n\n`[a](/recipes/ghost/)`\n\n```\n[b](/recipes/ghost2/)\n```',
      );
      const issues = (await runContentChecks(s.options)).filter(
        (issue) => issue.field === "body",
      );
      assert.equal(issues.length, 1);
      assert.match(issues[0]!.message, /\/recipes\/typo\//);
    });

    it("草稿專題內文不受限", async () => {
      const s = scenario();
      s.write(
        s.file,
        topic({ recipes: [], ingredients: [] })
          .replace("draft: false", "draft: true")
          .replace("\n做法。", "\n做法。\n\n[a](/recipes/typo/)\n"),
      );
      assert.deepEqual(await runContentChecks(s.options), []);
    });
  });
});
