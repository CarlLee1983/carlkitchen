import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { runContentChecks } from "../src/content-checks/run.ts";

const fixtures = fileURLToPath(
  new URL("./fixtures/content-checks/valid", import.meta.url),
);
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
  return {
    file,
    write,
    options: {
      recipesDir: join(root, "recipes"),
      sourcesDir: join(root, "sources"),
      ingredientsDir: join(root, "ingredients"),
      topicsDir: join(root, "topics"),
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
});
