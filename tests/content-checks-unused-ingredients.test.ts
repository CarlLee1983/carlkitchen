import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { runContentChecks } from "../src/content-checks/run.ts";
import { findUnusedIngredients } from "../src/content-checks/unused-ingredients.ts";

type Ing = { name: string; note?: string };
const unused = (ingredients: Ing[], steps: string[]) =>
  findUnusedIngredients("r", {
    ingredients,
    steps: steps.map((text) => ({ text })),
  }).map((warning) => warning.field);

describe("findUnusedIngredients", () => {
  it("步驟沒用到的材料產生警告，指出材料欄位", () => {
    const warnings = findUnusedIngredients("r", {
      ingredients: [{ name: "蛋" }, { name: "蝦仁" }],
      steps: [{ text: "把蛋打散。" }],
    });
    assert.equal(warnings.length, 1);
    assert.equal(warnings[0]?.recipe, "r");
    assert.equal(warnings[0]?.field, "ingredients.1");
    assert.match(warnings[0]!.message, /蝦仁/);
  });

  it("規則 1：括號內說明不參與比對", () => {
    assert.deepEqual(
      unused([{ name: "雞腿（帶骨棒棒腿）" }], ["雞腿煎香。"]),
      [],
    );
    assert.deepEqual(unused([{ name: "雞腿(帶骨)" }], ["雞腿煎香。"]), []);
  });

  it("規則 2：去掉畜種前綴也算", () => {
    assert.deepEqual(unused([{ name: "豬肥肉" }], ["肥肉切丁。"]), []);
  });

  it("規則 3：note 的「切成X」「切X」別名", () => {
    assert.deepEqual(
      unused([{ name: "青蔥", note: "切成蔥花" }], ["撒上蔥花。"]),
      [],
    );
    assert.deepEqual(
      unused([{ name: "青蔥", note: "切絲" }], ["撒上絲。"]),
      [],
    );
    assert.equal(
      unused([{ name: "青蔥", note: "切成蔥花" }], ["炒香。"]).length,
      1,
    );
  });

  it("規則 4：note 的分組標籤出現在步驟", () => {
    assert.deepEqual(
      unused([{ name: "醬油", note: "調味 A" }], ["調味 A 拌勻。"]),
      [],
    );
    assert.deepEqual(
      unused([{ name: "米酒", note: "醃料" }], ["加入醃料抓勻。"]),
      [],
    );
    assert.equal(
      unused([{ name: "醬油", note: "調味 A" }], ["拌勻。"]).length,
      1,
    );
  });

  it("規則 5：允許清單", () => {
    for (const name of ["食用油", "沙拉油", "炸油", "油", "外鍋水", "水"]) {
      assert.deepEqual(unused([{ name }], ["拌勻。"]), [], name);
    }
  });
});

const fixtures = fileURLToPath(
  new URL("./fixtures/content-checks", import.meta.url),
);
const cli = fileURLToPath(
  new URL("../scripts/check-content.ts", import.meta.url),
);
const workDirs: string[] = [];
after(() => {
  for (const dir of workDirs) rmSync(dir, { recursive: true, force: true });
});

/** 通過情境的第一份菜譜加一個步驟沒用到的材料；draft 為真時把它改成草稿。 */
function scenario(draft: boolean) {
  const root = mkdtempSync(join(tmpdir(), "unused-ing-"));
  workDirs.push(root);
  cpSync(join(fixtures, "valid"), root, { recursive: true });
  for (const dir of [
    "ingredients",
    "ingredient-sources",
    "topics",
    "topic-sources",
    "solar-terms",
    "solar-term-sources",
  ]) {
    mkdirSync(join(root, dir));
  }
  const file = join(root, "recipes", "alpha", "recipe.yaml");
  let yaml = readFileSync(file, "utf8").replace(
    /^ingredients:\n/m,
    "ingredients:\n  - { name: 神秘材料, amount: { value: 1, unit: 份 } }\n",
  );
  if (draft) yaml = yaml.replace(/^draft: false/m, "draft: true");
  writeFileSync(file, yaml);
  return {
    root,
    options: {
      recipesDir: join(root, "recipes"),
      sourcesDir: join(root, "sources"),
      distDir: join(root, "dist"),
      launch: false,
    },
  };
}

describe("未使用材料警告的整合", () => {
  it("已發布菜譜透過 onWarning 回報，不進 issues", async () => {
    const s = scenario(false);
    const warnings: { message: string }[] = [];
    const issues = await runContentChecks({
      ...s.options,
      onWarning: (warning) => warnings.push(warning),
    });
    assert.deepEqual(issues, []);
    assert.ok(warnings.some((warning) => /神秘材料/.test(warning.message)));
  });

  it("草稿菜譜不檢查", async () => {
    const s = scenario(true);
    const warnings: unknown[] = [];
    await runContentChecks({
      ...s.options,
      onWarning: (warning) => warnings.push(warning),
    });
    assert.deepEqual(warnings, []);
  });

  it("命令列印出警告但結束碼為 0", () => {
    const s = scenario(false);
    const result = spawnSync(
      process.execPath,
      ["--experimental-strip-types", cli, "--dist", s.options.distDir],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          RECIPES_DIR: s.options.recipesDir,
          SOURCES_DIR: s.options.sourcesDir,
          INGREDIENTS_DIR: join(s.root, "ingredients"),
          INGREDIENT_SOURCES_DIR: join(s.root, "ingredient-sources"),
          TOPICS_DIR: join(s.root, "topics"),
          TOPIC_SOURCES_DIR: join(s.root, "topic-sources"),
          SOLAR_TERMS_DIR: join(s.root, "solar-terms"),
          SOLAR_TERM_SOURCES_DIR: join(s.root, "solar-term-sources"),
        },
      },
    );
    assert.match(result.stderr + result.stdout, /神秘材料/);
    assert.equal(result.status, 0, result.stderr);
  });
});
