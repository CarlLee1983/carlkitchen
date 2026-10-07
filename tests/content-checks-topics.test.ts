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
});
