import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, it } from "node:test";
import { parse } from "yaml";
import { parseRecipe } from "../src/content-checks/recipes.ts";
import { checkLaunchThreshold } from "../src/content-checks/threshold.ts";
import {
  applyAction,
  candidatesFromRecipes,
  createPlan,
  isCompletePlan,
} from "../src/meal-planner/index.ts";

const recipesDir = new URL("../content/recipes/", import.meta.url);
const recipes = readdirSync(recipesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map(({ name: id }) => ({
    id,
    data: parse(readFileSync(new URL(`${id}/recipe.yaml`, recipesDir), "utf8")),
  }));
const byId = new Map(recipes.map((recipe) => [recipe.id, recipe.data]));
const pool = candidatesFromRecipes(recipes);
const candidatesById = new Map(
  pool.map((candidate) => [candidate.id, candidate]),
);
const baseline = JSON.parse(
  readFileSync(
    new URL("./recipe-classification-baseline.json", import.meta.url),
    "utf8",
  ),
) as { baseCommit: string; nonClassificationHashes: Record<string, string> };

const classificationFields = new Set([
  "vegetable",
  "protein",
  "dishKinds",
  "classificationReason",
]);

/** 比對資料內容，YAML 的縮排或鍵順序不算配方改動；陣列順序仍須保留。 */
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b, "en"))
        .map(([key, value]) => [key, canonical(value)]),
    );
  }
  return value;
}

describe("真實菜譜的分類與組餐角色", () => {
  it("原始 200 篇都在回歸範圍，新增菜譜也會檢查", () => {
    assert.equal(Object.keys(baseline.nonClassificationHashes).length, 200);
    assert.ok(recipes.length >= 200);
    for (const id of Object.keys(baseline.nonClassificationHashes)) {
      assert.ok(byId.has(id), `${id} 不可在分類遷移中消失`);
    }
  });

  for (const { id, data } of recipes) {
    it(`${id} 通過 schema 並分開瀏覽分類和組餐角色`, () => {
      assert.deepEqual(parseRecipe(id, data).issues, []);
      assert.ok(Array.isArray(data.dishKinds));
      assert.equal(new Set(data.dishKinds).size, data.dishKinds.length);
      assert.ok(data.classificationReason.trim().length > 0);
      switch (data.category) {
        case "非湯料理": {
          assert.ok(data.dishKinds.length > 0);
          const vegetableMain =
            data.dishKinds.length === 1 && data.dishKinds[0] === "vegetable";
          assert.equal(data.vegetable, vegetableMain);
          assert.equal(data.protein, !vegetableMain);
          break;
        }
        case "湯":
        case "主食":
          assert.deepEqual(data.dishKinds, []);
          assert.equal(data.vegetable, false);
          assert.equal(data.protein, false);
          break;
        default:
          assert.fail(`未知分類：${data.category}`);
      }
    });
  }

  for (const [id, dishKinds, vegetable, protein] of [
    ["tomato-egg", ["vegetable", "egg-bean"], false, true],
    ["shacha-lamb", ["meat"], false, true],
    ["pork-sauce-spinach", ["vegetable"], true, false],
    ["mapo-tofu", ["egg-bean"], false, true],
  ] as const) {
    it(`${id} 依主角分類，配料不冒充蔬菜主角`, () => {
      const data = byId.get(id);
      assert.ok(data);
      assert.deepEqual(data.dishKinds, [...dishKinds]);
      assert.deepEqual(candidatesById.get(id), {
        id,
        soup: false,
        vegetable,
        protein,
      });
    });
  }

  it("所有混合菜都不計入蔬菜角色，草稿與主食不進候選池", () => {
    const mixed = recipes.filter(({ data }) => data.dishKinds.length > 1);
    assert.ok(mixed.length > 0);
    for (const { id, data } of recipes) {
      if (data.draft || !data.mealCandidate || data.category === "主食") {
        assert.equal(candidatesById.has(id), false, id);
      }
      if (data.dishKinds.length > 1) {
        assert.equal(data.vegetable, false, id);
        assert.equal(data.protein, true, id);
        const candidate = candidatesById.get(id);
        if (candidate) assert.equal(candidate.vegetable, false, id);
      }
    }
  });

  it("四篇來源待核菜譜維持草稿，且沒有核准來源紀錄", () => {
    const quarantined = [
      "roast-chicken-legs",
      "salmon-rice",
      "seafood-fried-noodles",
      "unagi-rice",
    ];
    // 保護這四篇隔離狀態，不阻止日後新增其他合法草稿。
    for (const id of quarantined) {
      assert.equal(byId.get(id)?.draft, true, id);
      assert.equal(candidatesById.has(id), false, id);
      assert.equal(
        existsSync(new URL(`../content/sources/${id}.yaml`, import.meta.url)),
        false,
        id,
      );
    }
  });

  it("真實候選池通過部署門檻，四菜及五菜都保有獨立蔬菜主角", () => {
    assert.deepEqual(checkLaunchThreshold(recipes), []);
    for (const mode of [4, 5] as const) {
      for (let seed = 0; seed < 50; seed++) {
        const result = applyAction(pool, createPlan(seed, mode), {
          type: "reroll",
        });
        assert.equal(result.ok, true, result.ok ? "" : result.reason);
        if (!result.ok) continue;
        assert.equal(isCompletePlan(pool, result.plan), true);
        const dishes = result.plan.dishes.map(({ id }) => byId.get(id));
        assert.ok(
          dishes.some(
            (data) =>
              data.vegetable &&
              data.dishKinds.length === 1 &&
              data.dishKinds[0] === "vegetable",
          ),
        );
        assert.ok(dishes.some((data) => data.protein && !data.vegetable));
      }
    }
  });
});

// 這是 acdb091 的分類遷移保真基線。後續核准配方改動可更新個別雜湊，
// 不能為了分類測試通過而重建全部基線，否則會掩蓋無關內容改動。
describe("分類遷移不改配方、圖片參照或發布與候選狀態", () => {
  for (const [id, expectedHash] of Object.entries(
    baseline.nonClassificationHashes,
  )) {
    it(`${id} 的非分類欄位保持原樣`, () => {
      const data = byId.get(id);
      assert.ok(data);
      const nonClassification = Object.fromEntries(
        Object.entries(data).filter(([key]) => !classificationFields.has(key)),
      );
      const actualHash = createHash("sha256")
        .update(JSON.stringify(canonical(nonClassification)))
        .digest("hex");
      assert.equal(
        actualHash,
        expectedHash,
        `${id} 的配方、圖片參照、category、mealCandidate 或 draft 與 ${baseline.baseCommit} 不同`,
      );
    });
  }
});
