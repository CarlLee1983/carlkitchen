import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Candidate, Plan } from "../src/meal-planner/index.ts";
import { restorePlan, serializePlan } from "../src/utils/meal-session.ts";

const dish = (id: string, vegetable: boolean, protein: boolean): Candidate => ({
  id,
  soup: false,
  vegetable,
  protein,
});
const pool: Candidate[] = [
  dish("a", true, false),
  dish("b", false, true),
  dish("c", false, true),
  dish("d", false, true),
  { id: "s", soup: true, vegetable: false, protein: false },
];
const plan: Plan = {
  mode: 4,
  dishes: ["a", "b", "c", "d"].map((id, i) => ({ id, locked: i === 1 })),
  soup: { id: "s", locked: true },
  seed: 7,
};

describe("restorePlan", () => {
  it("沒有保存內容時回報 none", () => {
    assert.deepEqual(restorePlan(null, pool), { kind: "none" });
  });

  it("序列化後的套餐（含模式、鎖定與種子）可原樣還原", () => {
    assert.deepEqual(restorePlan(serializePlan(plan), pool), {
      kind: "restored",
      plan,
    });
  });

  it("尚未抽選的空套餐可還原", () => {
    const empty: Plan = { mode: 5, dishes: [], soup: null, seed: 1 };
    assert.deepEqual(restorePlan(serializePlan(empty), pool), {
      kind: "restored",
      plan: empty,
    });
  });

  it("保存的菜譜不在候選池時回報 stale", () => {
    const gone = {
      ...plan,
      dishes: [{ id: "gone", locked: false }, ...plan.dishes.slice(1)],
    };
    assert.deepEqual(restorePlan(serializePlan(gone), pool), { kind: "stale" });
  });

  it("單一道雙標記菜不能獨自滿足完整套餐的搭配", () => {
    const candidates = [
      dish("both", true, true),
      dish("plain-a", false, false),
      dish("plain-b", false, false),
      dish("plain-c", false, false),
      pool[4]!,
    ];
    const unbalanced: Plan = {
      ...plan,
      dishes: ["both", "plain-a", "plain-b", "plain-c"].map((id) => ({
        id,
        locked: false,
      })),
    };
    assert.deepEqual(restorePlan(serializePlan(unbalanced), candidates), {
      kind: "stale",
    });
  });

  it("有部分菜位、缺湯或菜湯放錯位置時不還原", () => {
    const invalid = [
      { ...plan, dishes: plan.dishes.slice(0, 2) },
      { ...plan, soup: null },
      {
        ...plan,
        dishes: [{ id: "s", locked: false }, ...plan.dishes.slice(1)],
      },
      { ...plan, soup: { id: "a", locked: false } },
    ];
    for (const candidate of invalid) {
      assert.deepEqual(restorePlan(serializePlan(candidate), pool), {
        kind: "stale",
      });
    }
  });

  it("菜數與模式不符、重複菜色都視為 stale", () => {
    const wrongMode = { ...plan, mode: 5 as const };
    assert.deepEqual(restorePlan(serializePlan(wrongMode), pool), {
      kind: "stale",
    });
    const dup = {
      ...plan,
      dishes: plan.dishes.map((slot) => ({ ...slot, id: "a" })),
    };
    assert.deepEqual(restorePlan(serializePlan(dup), pool), { kind: "stale" });
  });

  it("不是 JSON 或形狀錯誤時回報 stale，不丟例外", () => {
    for (const raw of ["{", "null", "42", '{"plan":1}', '{"mode":4}']) {
      assert.deepEqual(restorePlan(raw, pool), { kind: "stale" }, raw);
    }
    const badSlot = JSON.stringify({
      ...plan,
      dishes: [{ id: 1, locked: "x" }],
    });
    assert.deepEqual(restorePlan(badSlot, pool), { kind: "stale" });
    const badMode = JSON.stringify({ ...plan, mode: 6 });
    assert.deepEqual(restorePlan(badMode, pool), { kind: "stale" });
  });
});
