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
    vegetable: boolean;
    protein: boolean;
    dishKinds: ("vegetable" | "meat" | "seafood" | "egg-bean")[];
  }> = {},
) => ({
  id,
  data: {
    category: "非湯料理" as const,
    draft: false,
    mealCandidate: true,
    vegetable: true,
    protein: false,
    dishKinds: ["vegetable"] as (
      "vegetable" | "meat" | "seafood" | "egg-bean"
    )[],
    ...over,
  },
});

const pool = (dishes: number, soups: number) => [
  ...Array.from({ length: dishes }, (_, i) =>
    recipe(`d${i}`, {
      vegetable: i !== 1,
      protein: i === 1,
      dishKinds: i === 1 ? ["egg-bean"] : ["vegetable"],
    }),
  ),
  ...Array.from({ length: soups }, (_, i) =>
    recipe(`s${i}`, { category: "湯", vegetable: false, dishKinds: [] }),
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

  it("數量足夠但只有混合菜與肉蛋料理時，指出欠缺蔬菜主角", () => {
    const recipes = pool(MIN_DISHES, MIN_SOUPS).map((item) =>
      item.data.category === "湯"
        ? item
        : recipe(item.id, {
            vegetable: false,
            protein: true,
            dishKinds: ["vegetable", "egg-bean"],
          }),
    );
    const issues = checkLaunchThreshold(recipes);
    assert.equal(issues.length, 1);
    assert.match(issues[0]!.message, /四菜一湯.*五菜一湯/);
    assert.match(issues[0]!.message, /缺少.*蔬菜.*主角/);
  });

  it("數量足夠但沒有肉蛋料理時也不能部署", () => {
    const recipes = pool(MIN_DISHES, MIN_SOUPS);
    recipes[1] = recipe("d1");
    const issues = checkLaunchThreshold(recipes);
    assert.equal(issues.length, 1);
    assert.match(issues[0]!.message, /缺少另一道肉蛋料理/);
  });

  it("雙標記菜不能獨自滿足兩個角色", () => {
    const recipes = pool(MIN_DISHES, MIN_SOUPS).map((item, i) =>
      item.data.category === "湯"
        ? item
        : recipe(item.id, { vegetable: i === 0, protein: i === 0 }),
    );
    const issues = checkLaunchThreshold(recipes);
    assert.equal(issues.length, 1);
    assert.match(issues[0]!.message, /無法.*抽選|無法組成/);
  });

  it("草稿、非候選、主食和湯的標記都不能補足非湯蔬菜角色", () => {
    const recipes = pool(MIN_DISHES, MIN_SOUPS).map((item) =>
      item.data.category === "湯"
        ? { ...item, data: { ...item.data, vegetable: true } }
        : recipe(item.id, { vegetable: false, protein: true }),
    );
    recipes.push(
      recipe("draft-vegetable", { draft: true }),
      recipe("excluded-vegetable", { mealCandidate: false }),
      recipe("staple-vegetable", { category: "主食" }),
    );
    const issues = checkLaunchThreshold(recipes);
    assert.equal(issues.length, 1);
    assert.match(issues[0]!.message, /缺少.*蔬菜.*主角/);
  });
});
