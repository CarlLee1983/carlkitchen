import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  checkLaunchThreshold,
  MIN_DISHES,
  MIN_SOUPS,
} from "../src/content-checks/threshold.ts";

const recipe = (
  id: string,
  over: Partial<{
    category: "非湯料理" | "主食" | "湯";
    draft: boolean;
    mealCandidate: boolean;
  }> = {},
) => ({
  id,
  data: {
    category: "非湯料理" as const,
    draft: false,
    mealCandidate: true,
    vegetable: true,
    protein: false,
    ...over,
  },
});

const pool = (dishes: number, soups: number) => [
  ...Array.from({ length: dishes }, (_, i) => recipe(`d${i}`)),
  ...Array.from({ length: soups }, (_, i) =>
    recipe(`s${i}`, { category: "湯" }),
  ),
];

describe("checkLaunchThreshold", () => {
  it("剛好 12 道非湯料理與 3 道湯即通過", () => {
    assert.deepEqual(checkLaunchThreshold(pool(MIN_DISHES, MIN_SOUPS)), []);
  });

  it("兩類都不足時各列一項缺額", () => {
    const issues = checkLaunchThreshold(pool(9, 1));
    assert.equal(issues.length, 2);
    assert.match(issues[0]!.message, /缺 3 道/);
    assert.match(issues[1]!.message, /缺 2 道/);
  });

  it("空內容時缺額為全額", () => {
    const issues = checkLaunchThreshold([]);
    assert.match(issues[0]!.message, /缺 12 道/);
    assert.match(issues[1]!.message, /缺 3 道/);
  });

  it("草稿與非配菜候選不計入（沿用候選池規則）", () => {
    const recipes = [
      ...pool(MIN_DISHES, MIN_SOUPS),
      recipe("x", { draft: true }),
    ];
    recipes[0] = recipe("d0", { mealCandidate: false });
    const issues = checkLaunchThreshold(recipes);
    assert.equal(issues.length, 1);
    assert.match(issues[0]!.message, /缺 1 道/);
  });

  it("主食不計入，即使資料被標成配菜候選", () => {
    const recipes = [
      ...pool(MIN_DISHES - 1, MIN_SOUPS),
      recipe("noodles", { category: "主食" }),
    ];
    const issues = checkLaunchThreshold(recipes);
    assert.equal(issues.length, 1);
    assert.match(issues[0]!.message, /缺 1 道/);
  });
});
