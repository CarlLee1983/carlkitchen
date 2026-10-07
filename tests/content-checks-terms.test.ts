import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { runContentChecks } from "../src/content-checks/run.ts";
import { checkTerms, findAvoidedTerms } from "../src/content-checks/terms.ts";
import { TAIWAN_TERMS } from "../src/content/taiwan-terms.ts";

const fixtures = fileURLToPath(
  new URL("./fixtures/content-checks/valid", import.meta.url),
);
const workDirs: string[] = [];

const ingredient = (summary: string) => `title: 高麗菜
summary: ${summary}
category: seasoning
draft: true
selection: 看外觀。
preparation: 洗淨。
storage: 冷藏。
uses: 清炒。
relatedRecipes: []
`;

const topic = (options: { body: string; refTitle?: string }) => `---
title: 炒菜的火候
summary: 火候與調味。
draft: true
publishedAt: 2026-09-01
relatedRecipes: []
relatedIngredients: []
references:
  - author: 某某某
    title: ${options.refTitle ?? "參考文章"}
    url: https://example.com/ref
---

${options.body}
`;

function scenario() {
  const root = mkdtempSync(join(tmpdir(), "term-checks-"));
  workDirs.push(root);
  cpSync(fixtures, root, { recursive: true });
  const write = (path: string, content: string) => {
    mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(path, content);
  };
  return {
    root,
    write,
    options: {
      recipesDir: join(root, "recipes"),
      sourcesDir: join(root, "sources"),
      ingredientsDir: join(root, "ingredients"),
      ingredientSourcesDir: join(root, "ingredient-sources"),
      topicsDir: join(root, "topics"),
      topicSourcesDir: join(root, "topic-sources"),
      distDir: join(root, "dist"),
      launch: false,
    },
  };
}

/** 只留用詞問題，避免草稿專題缺來源紀錄等無關訊息干擾。 */
const termIssues = async (options: ReturnType<typeof scenario>["options"]) =>
  (await runContentChecks(options)).filter((issue) =>
    issue.message.startsWith("用詞"),
  );

after(() => {
  for (const dir of workDirs) rmSync(dir, { recursive: true, force: true });
});

describe("用詞表", () => {
  it("避免詞不重複，也不與採用詞互相包含", () => {
    const avoid = TAIWAN_TERMS.flatMap((term) => term.avoid);
    assert.equal(new Set(avoid).size, avoid.length);
    for (const { use } of TAIWAN_TERMS) {
      for (const term of avoid)
        assert.ok(!use.includes(term), `${use} ${term}`);
    }
  });
});

describe("findAvoidedTerms", () => {
  it("同時認得繁體與簡體寫法", () => {
    assert.deepEqual(findAvoidedTerms("西蘭花和西兰花"), ["西蘭花", "西兰花"]);
    assert.deepEqual(findAvoidedTerms("腌制後出锅"), ["腌", "出锅"]);
  });

  it("長詞優先，不粘鍋只算一次", () => {
    assert.deepEqual(findAvoidedTerms("用不粘鍋"), ["不粘鍋"]);
    assert.deepEqual(findAvoidedTerms("容易粘鍋"), ["粘鍋"]);
  });

  it("「」與『』包住的引述不算使用", () => {
    assert.deepEqual(
      findAvoidedTerms("中國菜譜寫的「料酒」，本篇寫作米酒"),
      [],
    );
    assert.deepEqual(findAvoidedTerms("他們說『生抽』就是醬油"), []);
    assert.deepEqual(findAvoidedTerms("「料酒」之外還加了生抽"), ["生抽"]);
  });

  it("網址不算使用", () => {
    assert.deepEqual(findAvoidedTerms("見 https://example.com/生抽/ 說明"), []);
  });

  it("包含避免詞的合法較長片語不算命中，其餘位置照樣命中", () => {
    assert.deepEqual(findAvoidedTerms("爆香蔥段，帶出鍋外的油菜花"), []);
    assert.deepEqual(findAvoidedTerms("菠蘿麵包"), []);
    assert.deepEqual(findAvoidedTerms("爆香蔥段後加香蔥"), ["香蔥"]);
    assert.deepEqual(findAvoidedTerms("出鍋外面再出鍋"), ["出鍋"]);
  });

  it("臺灣常用的蒜蓉、肉餡、一勺不是避免詞", () => {
    assert.deepEqual(findAvoidedTerms("蒜蓉醬油、水餃肉餡、一勺"), []);
  });

  it("臺灣用詞不誤報", () => {
    assert.deepEqual(findAvoidedTerms("米酒、醬油、汆燙、醃漬、起鍋"), []);
  });
});

describe("checkTerms", () => {
  it("指出欄位路徑、詞與建議用詞，附 note", () => {
    const issues = checkTerms({ recipe: "x" }, "f.yaml", {
      steps: [{ text: "加料酒。" }],
    });
    assert.equal(issues.length, 1);
    assert.equal(issues[0]?.field, "steps.0.text");
    assert.equal(issues[0]?.file, "f.yaml");
    assert.match(issues[0]!.message, /料酒.*米酒.*黃酒/);
  });

  it("略過 url、urls、src 與指定欄位", () => {
    const issues = checkTerms(
      { topic: "x" },
      "f.md",
      {
        hero: { src: "生抽.webp", alt: "圖" },
        references: [{ title: "生抽怎麼用", url: "https://a.com/生抽" }],
      },
      /^references\.\d+\.title$/,
    );
    assert.deepEqual(issues, []);
  });
});

describe("check:content 用詞檢查", () => {
  it("固定資料沒有用詞問題", async () => {
    assert.deepEqual(await termIssues(scenario().options), []);
  });

  it("菜譜的每個文字欄位含替代文字，已發布與草稿都檢查", async () => {
    const s = scenario();
    s.write(
      join(s.root, "recipes/alpha/recipe.yaml"),
      `title: 範例菜
summary: 加生抽的蛋。
servings: 2
category: 非湯料理
vegetable: true
draft: false
timeMinutes: 10
ingredients:
  - { name: 土豆, amount: { value: 2, unit: 顆 } }
steps:
  - text: 蛋打散後下鍋炒熟。
    image: { src: ./step-1.webp, alt: 鍋中的炒蛋 }
hero: { src: ./hero.webp, alt: 盤中的菠蘿炒蛋 }
ingredientsPhoto: { src: ./ingredients.webp, alt: 兩顆蛋 }
`,
    );
    s.write(
      join(s.root, "recipes/draft-one/recipe.yaml"),
      "title: 草稿\nsummary: 腌過的肉。\ndraft: true\n",
    );
    const issues = await termIssues(s.options);
    assert.deepEqual(
      issues.map((issue) => [issue.recipe, issue.field]).sort(),
      [
        ["alpha", "hero.alt"],
        ["alpha", "ingredients.0.name"],
        ["alpha", "summary"],
        ["draft-one", "summary"],
      ],
    );
    assert.ok(issues.every((issue) => issue.file?.endsWith("recipe.yaml")));
  });

  it("食材條目的文字欄位", async () => {
    const s = scenario();
    s.write(
      join(s.root, "ingredients/cabbage/ingredient.yaml"),
      ingredient("可以拿來焯水。"),
    );
    const issues = await termIssues(s.options);
    assert.equal(issues.length, 1);
    assert.equal(issues[0]?.ingredient, "cabbage");
    assert.equal(issues[0]?.field, "summary");
    assert.match(issues[0]!.message, /焯水.*汆燙/);
  });

  it("專題 frontmatter 與內文；草稿也檢查", async () => {
    const s = scenario();
    s.write(
      join(s.root, "topics/heat/topic.md"),
      topic({ body: "## 火候\n\n起鍋前加生抽。\n" }),
    );
    const issues = await termIssues(s.options);
    assert.equal(issues.length, 1);
    assert.equal(issues[0]?.topic, "heat");
    assert.equal(issues[0]?.field, "body");
    assert.match(issues[0]!.message, /生抽.*醬油/);
  });

  it("專題用引號說明用詞差異不算使用", async () => {
    const s = scenario();
    s.write(
      join(s.root, "topics/heat/topic.md"),
      topic({ body: "中國菜譜寫的「料酒」，本篇寫作米酒。\n" }),
    );
    assert.deepEqual(await termIssues(s.options), []);
  });

  it("選題參考的標題與作者是外文引用，不檢查", async () => {
    const s = scenario();
    s.write(
      join(s.root, "topics/heat/topic.md"),
      topic({ body: "內文。\n", refTitle: "生抽老抽怎麼分" }),
    );
    assert.deepEqual(await termIssues(s.options), []);
  });
});
