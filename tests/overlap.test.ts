import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";
import {
  copiedSpans,
  findOverlaps,
  normalize,
  recipeFields,
  topicFields,
  topicRecipeIds,
} from "../.claude/skills/recipe-making/scripts/overlap-lib.mjs";

const topic = `---
title: 測試專題
summary: 這是專題摘要。
relatedRecipes:
  - tomato-egg
---

## 標題不比對

![封面圖](./hero.webp)

先看[番茄炒蛋](/recipes/tomato-egg/)怎麼做，再看 [炒青菜](/recipes/garlic-greens/)。

第二段文字。
`;

describe("overlap 文字抽取", () => {
  it("專題取 summary 與正文段落，去掉標題、圖片，連結只留文字", () => {
    const fields = topicFields(topic);
    assert.deepEqual(
      fields.map(([name]) => name),
      ["summary", "body.1", "body.2"],
    );
    assert.equal(fields[1]?.[1], "先看番茄炒蛋怎麼做，再看 炒青菜。");
    assert.ok(!fields.some(([, text]) => text.includes("標題不比對")));
    assert.ok(!fields.some(([, text]) => text.includes("hero.webp")));
  });

  it("專題關聯菜譜合併 frontmatter 與正文連結並去重", () => {
    assert.deepEqual(topicRecipeIds(topic).sort(), [
      "garlic-greens",
      "tomato-egg",
    ]);
  });

  it("菜譜取 summary、步驟、材料 note 與 tips", () => {
    const fields = recipeFields({
      summary: "摘要",
      steps: [{ text: "步驟一" }],
      ingredients: [{ name: "蔥", note: "切段" }, { name: "鹽" }],
      tips: ["小訣竅", { text: "物件訣竅" }],
    });
    assert.deepEqual(
      fields.map(([name]) => name),
      ["summary", "steps.1", "ingredients.蔥.note", "tips.1", "tips.2"],
    );
  });
});

describe("overlap 片段比對", () => {
  it("忽略標點與空白，找出達門檻的相同片段", () => {
    const source = normalize("先把番茄切塊，再下鍋炒到出汁就可以起鍋。");
    const spans = copiedSpans(
      normalize("番茄切塊 再下鍋炒到出汁就可以"),
      source,
    );
    assert.deepEqual(spans, ["番茄切塊再下鍋炒到出汁就可以"]);
  });

  it("低於門檻不算", () => {
    assert.deepEqual(
      copiedSpans(normalize("番茄切塊"), normalize("番茄切塊")),
      [],
    );
  });

  it("findOverlaps 回報欄位名", () => {
    const hits = findOverlaps(
      [["body.1", "完全相同的一段很長的文字內容"]],
      normalize("前面 完全相同的一段很長的文字內容 後面"),
    );
    assert.equal(hits.length, 1);
    assert.equal(hits[0].field, "body.1");
  });
});

const run = (args: string[], env: Record<string, string> = {}) =>
  spawnSync(process.execPath, args, {
    encoding: "utf8",
    env: { ...process.env, ...env },
  });

describe("overlap.mjs 命令列", () => {
  const overlap = ".claude/skills/recipe-making/scripts/overlap.mjs";

  it("專題對菜譜：未重複結束碼 0", () => {
    const result = run([
      overlap,
      "tests/fixtures/topics/rice-basics/topic.md",
      "tests/fixtures/recipes/egg-drop-soup/recipe.yaml",
    ]);
    assert.equal(result.status, 0, result.stdout + result.stderr);
  });

  it("菜譜對自己：結束碼 1", () => {
    const recipe = "tests/fixtures/recipes/tomato-egg/recipe.yaml";
    const result = run([overlap, recipe, recipe]);
    assert.equal(result.status, 1);
  });

  it("缺參數：結束碼 2", () => {
    assert.equal(run([overlap]).status, 2);
  });
});

describe("check-overlap 專題對菜譜", () => {
  const check = "scripts/check-overlap.mjs";
  const env = {
    RECIPES_DIR: "tests/fixtures/recipes",
    TOPICS_DIR: "tests/fixtures/topics",
  };

  it("固定專題與其關聯菜譜無重複：OK、結束碼 0", () => {
    const result = run([check, "rice-basics"], env);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /rice-basics.*egg-drop-soup.*OK/);
  });

  it("沒有識別值：結束碼 2", () => {
    assert.equal(run([check], env).status, 2);
  });
});
