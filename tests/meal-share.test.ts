import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  candidatesFromRecipes,
  type Candidate,
  type Plan,
} from "../src/meal-planner/index.ts";
import { decodeSharedMeal, encodeSharedMeal } from "../src/utils/meal-share.ts";

const dish = (id: string, vegetable: boolean, protein: boolean): Candidate => ({
  id,
  soup: false,
  vegetable,
  protein,
});
const pool: Candidate[] = [
  dish("cabbage", true, false),
  dish("beef", false, true),
  dish("chicken", false, true),
  dish("tofu", false, true),
  dish("fish", false, true),
  { id: "soup", soup: true, vegetable: false, protein: false },
];
const plan: Plan = {
  mode: 4,
  dishes: ["beef", "cabbage", "tofu", "fish"].map((id) => ({
    id,
    locked: true,
  })),
  soup: { id: "soup", locked: true },
  seed: 123,
};

describe("分享菜單編碼", () => {
  it("混合菜分類不能讓舊連結跳過獨立蔬菜主角的規則", () => {
    const mixedRecipe = {
      id: "tomato-egg",
      data: {
        category: "非湯料理" as const,
        draft: false,
        mealCandidate: true,
        vegetable: false,
        protein: true,
        dishKinds: ["vegetable", "egg-bean"],
      },
    };
    const mixedPool = [...pool, ...candidatesFromRecipes([mixedRecipe])];
    for (const value of [
      "v1.4.beef,tomato-egg,tofu,fish.soup",
      "v1.5.beef,tomato-egg,tofu,fish,chicken.soup",
    ]) {
      const result = decodeSharedMeal(value, mixedPool);
      assert.equal(result.ok, false);
      if (!result.ok)
        assert.match(result.reason, /以蔬菜為主.*另一道.*肉、海鮮或蛋豆/);
    }
    assert.equal(
      decodeSharedMeal("v1.4.cabbage,tomato-egg,tofu,fish.soup", mixedPool).ok,
      true,
    );
  });

  it("四菜與五菜保留順序，收件菜單不含鎖定與原種子", () => {
    for (const current of [
      plan,
      {
        ...plan,
        mode: 5 as const,
        dishes: [...plan.dishes, { id: "chicken", locked: false }],
      },
    ]) {
      const encoded = encodeSharedMeal(current, pool);
      assert.ok(encoded);
      assert.match(encoded, /^v1\.[45]\./);
      assert.deepEqual(decodeSharedMeal(encoded, pool), {
        ok: true,
        plan: {
          mode: current.mode,
          dishes: current.dishes.map(({ id }) => ({ id, locked: false })),
          soup: { id: "soup", locked: false },
          seed: 0,
        },
      });
    }
    assert.equal(
      encodeSharedMeal(plan, pool),
      "v1.4.beef,cabbage,tofu,fish.soup",
    );
  });

  it("拒絕版本、長度、格式與不正確菜數", () => {
    const invalid = [
      "v2.4.beef,cabbage,tofu,fish.soup",
      "v1.4.beef,cabbage,tofu,fish.soup" + "x".repeat(2048),
      "v1.4.beef,cabbage,tofu.soup",
      "v1.4.beef,,tofu,fish.soup",
      "v1.4.beef,cabbage,tofu,fish.soup.extra",
      "v1.4.beef,cabbage,tofu,fish.%73oup",
      "v1.6.beef,cabbage,tofu,fish.soup",
    ];
    for (const value of invalid) {
      const result = decodeSharedMeal(value, pool);
      assert.equal(result.ok, false, value);
      if (!result.ok) assert.ok(result.reason.length > 0);
    }
  });

  it("拒絕重複、下架、分類錯誤與失衡菜單", () => {
    const invalid = [
      "v1.4.beef,cabbage,tofu,beef.soup",
      "v1.4.beef,cabbage,tofu,gone.soup",
      "v1.4.soup,cabbage,tofu,fish.beef",
      "v1.4.beef,chicken,tofu,fish.soup",
    ];
    for (const value of invalid) {
      assert.equal(decodeSharedMeal(value, pool).ok, false, value);
    }
    assert.equal(encodeSharedMeal({ ...plan, soup: null }, pool), null);
    assert.equal(
      encodeSharedMeal({ ...plan, dishes: plan.dishes.slice(1) }, pool),
      null,
    );
    const malformedPool = [dish("bad_id", true, false), ...pool.slice(1)];
    assert.equal(
      encodeSharedMeal(
        {
          ...plan,
          dishes: plan.dishes.map((slot) =>
            slot.id === "cabbage" ? { ...slot, id: "bad_id" } : slot,
          ),
        },
        malformedPool,
      ),
      null,
    );
  });
});
