import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyAction,
  candidatesFromRecipes,
  createPlan,
  isPlanUsable,
  type Action,
  type Candidate,
  type Plan,
  type Result,
} from "../src/meal-planner/index.ts";

const veg = (id: string): Candidate => ({
  id,
  soup: false,
  vegetable: true,
  protein: false,
});
const pro = (id: string): Candidate => ({
  id,
  soup: false,
  vegetable: false,
  protein: true,
});
const both = (id: string): Candidate => ({
  id,
  soup: false,
  vegetable: true,
  protein: true,
});
const plain = (id: string): Candidate => ({
  id,
  soup: false,
  vegetable: false,
  protein: false,
});
const soup = (id: string): Candidate => ({
  id,
  soup: true,
  vegetable: false,
  protein: false,
});

/** 與原型相同形狀的正常候選池：12 道非湯菜加 3 道湯。 */
const normalPool: Candidate[] = [
  veg("cabbage"),
  veg("spinach"),
  veg("mushroom"),
  veg("cauliflower"),
  veg("eggplant"),
  both("tomato-egg"),
  pro("tofu"),
  pro("fish"),
  pro("chicken"),
  pro("beef"),
  pro("shrimp"),
  pro("pasta"),
  soup("radish-soup"),
  soup("egg-soup"),
  soup("corn-soup"),
];

const byId = (pool: readonly Candidate[]) =>
  new Map(pool.map((candidate) => [candidate.id, candidate]));

const dishIds = (plan: Plan) => plan.dishes.map((slot) => slot.id);

function ok(result: Result): Extract<Result, { ok: true }> {
  assert.equal(result.ok, true, result.ok ? "" : result.reason);
  return result as Extract<Result, { ok: true }>;
}

function fail(result: Result): Extract<Result, { ok: false }> {
  assert.equal(result.ok, false);
  return result as Extract<Result, { ok: false }>;
}

/** 斷言套餐合乎全部結構規則：數量、不重複、只用候選、湯類別、平衡。 */
function assertValid(pool: readonly Candidate[], plan: Plan) {
  const lookup = byId(pool);
  assert.equal(plan.dishes.length, plan.mode);
  assert.ok(plan.soup, "必須有湯");
  const ids = [...dishIds(plan), plan.soup.id];
  assert.equal(new Set(ids).size, ids.length, "不得重複");
  for (const slot of plan.dishes) {
    const candidate = lookup.get(slot.id);
    assert.ok(candidate, `${slot.id} 必須在候選池`);
    assert.equal(candidate.soup, false);
  }
  assert.equal(lookup.get(plan.soup.id)?.soup, true);
  const dishes = plan.dishes.map((slot) => lookup.get(slot.id)!);
  const balanced = dishes.some(
    (a, i) => a.vegetable && dishes.some((b, j) => i !== j && b.protein),
  );
  assert.ok(balanced, "必須有蔬菜與另一道肉蛋料理");
}

const reroll: Action = { type: "reroll" };

function drawn(seed = 1, mode: 4 | 5 = 4, pool = normalPool): Plan {
  return ok(applyAction(pool, createPlan(seed, mode), reroll)).plan;
}

function withLocks(plan: Plan, indices: number[], soupLocked = false): Plan {
  return {
    ...plan,
    dishes: plan.dishes.map((slot, i) => ({
      ...slot,
      locked: indices.includes(i),
    })),
    soup: plan.soup && { ...plan.soup, locked: soupLocked },
  };
}

describe("candidatesFromRecipes", () => {
  const recipe = (
    id: string,
    data: Partial<{
      category: "非湯料理" | "主食" | "湯";
      draft: boolean;
      mealCandidate: boolean;
      vegetable: boolean;
      protein: boolean;
    }>,
  ) => ({
    id,
    data: {
      category: "非湯料理" as const,
      draft: false,
      mealCandidate: true,
      vegetable: false,
      protein: false,
      ...data,
    },
  });

  it("只保留已發布的配菜候選，並轉出類別與平衡標記", () => {
    const candidates = candidatesFromRecipes([
      recipe("a", { vegetable: true }),
      recipe("b", { protein: true, vegetable: true }),
      recipe("c", { category: "湯" }),
      recipe("not-candidate", { mealCandidate: false }),
      recipe("draft", { draft: true }),
      recipe("staple", { category: "主食" }),
    ]);
    assert.deepEqual(candidates, [
      { id: "a", soup: false, vegetable: true, protein: false },
      { id: "b", soup: false, vegetable: true, protein: true },
      { id: "c", soup: true, vegetable: false, protein: false },
    ]);
  });
});

describe("初次抽選與重抽", () => {
  it("產生 4 道互不重複的非湯菜加 1 道湯，成功訊息為繁中", () => {
    const result = ok(applyAction(normalPool, createPlan(7), reroll));
    assertValid(normalPool, result.plan);
    assert.equal(result.plan.dishes.length, 4);
    assert.match(result.message, /[一-鿿]/);
  });

  it("只從配菜候選抽選：池外的菜不會出現", () => {
    const plan = drawn(3);
    const ids = new Set(normalPool.map((c) => c.id));
    for (const id of [...dishIds(plan), plan.soup!.id]) assert.ok(ids.has(id));
  });

  it("同一道雙標記菜不能獨自滿足蔬菜與蛋白質", () => {
    const pool = [both("x"), plain("a"), plain("b"), plain("c"), soup("s")];
    const result = fail(applyAction(pool, createPlan(1), reroll));
    assert.match(result.reason, /[一-鿿]/);
  });

  it("雙標記菜可與另一道單標記菜共同滿足平衡", () => {
    const pool = [both("x"), pro("p"), plain("a"), plain("b"), soup("s")];
    for (let seed = 0; seed < 20; seed++) {
      assertValid(pool, ok(applyAction(pool, createPlan(seed), reroll)).plan);
    }
  });

  it("保留鎖定項在原位置，未鎖定位置盡量換成上一組沒有的菜", () => {
    for (let seed = 0; seed < 50; seed++) {
      const before = withLocks(drawn(seed), [1], true);
      const after: Plan = ok(applyAction(normalPool, before, reroll)).plan;
      assertValid(normalPool, after);
      assert.deepEqual(after.dishes[1], before.dishes[1]);
      assert.deepEqual(after.soup, before.soup);
      for (const i of [0, 2, 3]) {
        assert.notEqual(after.dishes[i]!.id, before.dishes[i]!.id);
      }
      const old = new Set(dishIds(before));
      const reused = after.dishes.filter(
        (slot, i) => i !== 1 && old.has(slot.id),
      );
      assert.equal(reused.length, 0, "候選充足時未鎖定位置不應沿用舊菜");
    }
  });

  it("未鎖定的湯盡量換成不同的湯", () => {
    for (let seed = 0; seed < 30; seed++) {
      const before = drawn(seed);
      const after = ok(applyAction(normalPool, before, reroll)).plan;
      assert.notEqual(after.soup!.id, before.soup!.id);
    }
  });

  it("候選有限時可保留部分原菜，但仍不重複", () => {
    // 只有 5 道非湯菜：換 4 道必然沿用至少 3 道
    const pool = [
      veg("v1"),
      veg("v2"),
      pro("p1"),
      pro("p2"),
      plain("n1"),
      soup("s1"),
      soup("s2"),
    ];
    for (let seed = 0; seed < 50; seed++) {
      const before = drawn(seed, 4, pool);
      const after: Plan = ok(applyAction(pool, before, reroll)).plan;
      assertValid(pool, after);
      const reused = dishIds(after).filter((id) =>
        dishIds(before).includes(id),
      );
      assert.equal(reused.length, 3);
    }
  });

  it("沒有新組合可換時保留原菜並說明（仍為成功）", () => {
    const pool = [veg("v"), pro("p"), plain("a"), plain("b"), soup("s")];
    const before = drawn(1, 4, pool);
    const result = ok(applyAction(pool, before, reroll));
    assert.deepEqual(
      [...dishIds(result.plan)].sort(),
      [...dishIds(before)].sort(),
    );
    assert.match(result.message, /無法換出新組合/);
  });
});

describe("候選不足與無法平衡", () => {
  it("非湯菜少於菜位時回無解，套餐維持原狀", () => {
    const pool = [veg("v"), pro("p"), plain("a"), soup("s")];
    const plan = createPlan(5);
    const result = fail(applyAction(pool, plan, reroll));
    assert.deepEqual(result.plan, createPlan(5));
    assert.match(result.reason, /非湯菜不足/);
  });

  it("沒有湯時回無解", () => {
    const pool = normalPool.filter((c) => !c.soup);
    const result = fail(applyAction(pool, createPlan(5), reroll));
    assert.match(result.reason, /沒有湯/);
  });

  it("沒有肉蛋料理時無法平衡，回無解", () => {
    const pool = [veg("a"), veg("b"), veg("c"), veg("d"), veg("e"), soup("s")];
    const result = fail(applyAction(pool, createPlan(5), reroll));
    assert.match(result.reason, /缺少蔬菜或另一道肉蛋料理/);
    assert.doesNotMatch(result.reason, /鎖定/);
  });

  it("鎖定項使套餐無法平衡時回無解並保留原套餐", () => {
    const pool = [
      veg("v1"),
      plain("a"),
      plain("b"),
      plain("c"),
      plain("d"),
      pro("p"),
      soup("s"),
    ];
    const before: Plan = {
      mode: 4,
      dishes: [
        { id: "a", locked: true },
        { id: "b", locked: true },
        { id: "c", locked: true },
        { id: "d", locked: true },
      ],
      soup: { id: "s", locked: false },
      seed: 9,
    };
    const result = fail(applyAction(pool, before, reroll));
    assert.deepEqual(result.plan, before);
    assert.match(result.reason, /鎖定/);
  });

  it("套餐含不在候選池的菜色時回無解", () => {
    const before: Plan = {
      mode: 4,
      dishes: [{ id: "gone", locked: true }],
      soup: null,
      seed: 1,
    };
    const result = fail(applyAction(normalPool, before, reroll));
    assert.match(result.reason, /候選池/);
    assert.deepEqual(result.plan, before);
  });
});

describe("單道替換", () => {
  it("只改一個未鎖定位置，排除已選菜色並維持平衡", () => {
    for (let seed = 0; seed < 50; seed++) {
      const before = drawn(seed);
      const target = seed % 4;
      const result = ok(
        applyAction(normalPool, before, { type: "replace", target }),
      );
      assertValid(normalPool, result.plan);
      result.plan.dishes.forEach((slot, i) => {
        if (i === target) assert.notEqual(slot.id, before.dishes[i]!.id);
        else assert.deepEqual(slot, before.dishes[i]);
      });
      assert.deepEqual(result.plan.soup, before.soup);
      assert.equal(result.plan.mode, before.mode);
    }
  });

  it("替換位置不會被替成會破壞平衡的菜", () => {
    // 唯一的肉蛋料理被替換，只有另一道肉蛋料理可補位，純素菜 c 不行
    const pool = [
      veg("v"),
      pro("p"),
      plain("a"),
      plain("b"),
      plain("c"),
      pro("p2"),
      soup("s"),
    ];
    const before: Plan = {
      mode: 4,
      dishes: ["v", "p", "a", "b"].map((id) => ({ id, locked: false })),
      soup: { id: "s", locked: false },
      seed: 3,
    };
    const result = ok(
      applyAction(pool, before, { type: "replace", target: 1 }),
    );
    assert.equal(result.plan.dishes[1]!.id, "p2");
  });

  it("沒有不重複且平衡的替代時回無解，原套餐不變", () => {
    const pool = [
      veg("v"),
      pro("p"),
      plain("a"),
      plain("b"),
      plain("c"),
      soup("s"),
    ];
    const before: Plan = {
      mode: 4,
      dishes: ["v", "p", "a", "b"].map((id) => ({ id, locked: false })),
      soup: { id: "s", locked: false },
      seed: 3,
    };
    const result = fail(
      applyAction(pool, before, { type: "replace", target: 1 }),
    );
    assert.deepEqual(result.plan, before);
    assert.match(result.reason, /沒有/);
  });

  it("已鎖定項回無解並提示先解鎖", () => {
    const before = withLocks(drawn(2), [2]);
    const result = fail(
      applyAction(normalPool, before, { type: "replace", target: 2 }),
    );
    assert.match(result.reason, /解鎖/);
    assert.deepEqual(result.plan, before);
  });

  it("尚未抽選或位置不存在時回無解", () => {
    fail(
      applyAction(normalPool, createPlan(1), { type: "replace", target: 0 }),
    );
    fail(applyAction(normalPool, drawn(1), { type: "replace", target: 9 }));
    fail(
      applyAction(normalPool, createPlan(1), {
        type: "replace",
        target: "soup",
      }),
    );
  });
});

describe("湯的鎖定與替換", () => {
  it("可鎖定湯，重抽與模式切換都保留", () => {
    let plan = drawn(4);
    plan = ok(
      applyAction(normalPool, plan, { type: "toggle", target: "soup" }),
    ).plan;
    assert.equal(plan.soup!.locked, true);
    const soupId = plan.soup!.id;
    const rerolled = ok(applyAction(normalPool, plan, reroll)).plan;
    assert.deepEqual(rerolled.soup, { id: soupId, locked: true });
    const switched = ok(
      applyAction(normalPool, rerolled, { type: "mode", mode: 5 }),
    ).plan;
    assert.deepEqual(switched.soup, { id: soupId, locked: true });
  });

  it("可替換未鎖定的湯，只換湯、不重複", () => {
    for (let seed = 0; seed < 30; seed++) {
      const before = drawn(seed);
      const result = ok(
        applyAction(normalPool, before, { type: "replace", target: "soup" }),
      );
      assertValid(normalPool, result.plan);
      assert.notEqual(result.plan.soup!.id, before.soup!.id);
      assert.deepEqual(result.plan.dishes, before.dishes);
    }
  });

  it("鎖定的湯不能替換，並提示先解鎖", () => {
    const before = withLocks(drawn(1), [], true);
    const result = fail(
      applyAction(normalPool, before, { type: "replace", target: "soup" }),
    );
    assert.match(result.reason, /解鎖/);
  });

  it("只有一道湯時替換湯回無解", () => {
    const pool = [...normalPool.filter((c) => !c.soup), soup("only")];
    const before = drawn(1, 4, pool);
    const result = fail(
      applyAction(pool, before, { type: "replace", target: "soup" }),
    );
    assert.deepEqual(result.plan, before);
  });
});

describe("鎖定切換", () => {
  it("切換非湯菜的鎖定，不推進種子也不改菜色", () => {
    const before = drawn(1);
    const locked = ok(
      applyAction(normalPool, before, { type: "toggle", target: 0 }),
    ).plan;
    assert.equal(locked.dishes[0]!.locked, true);
    assert.equal(locked.seed, before.seed);
    const unlocked = ok(
      applyAction(normalPool, locked, { type: "toggle", target: 0 }),
    ).plan;
    assert.deepEqual(unlocked, before);
  });

  it("尚未抽選時切換回無解", () => {
    fail(applyAction(normalPool, createPlan(1), { type: "toggle", target: 0 }));
    fail(
      applyAction(normalPool, createPlan(1), {
        type: "toggle",
        target: "soup",
      }),
    );
  });
});

describe("模式切換", () => {
  it("四切五保留鎖定項在原位置，其餘重抽", () => {
    for (let seed = 0; seed < 30; seed++) {
      const before = withLocks(drawn(seed), [0, 3]);
      const after = ok(
        applyAction(normalPool, before, { type: "mode", mode: 5 }),
      ).plan;
      assert.equal(after.mode, 5);
      assertValid(normalPool, after);
      assert.deepEqual(after.dishes[0], before.dishes[0]);
      assert.deepEqual(after.dishes[3], before.dishes[3]);
    }
  });

  it("五切四保留所有鎖定項（含原本在第五位的）", () => {
    for (let seed = 0; seed < 30; seed++) {
      const before = withLocks(drawn(seed, 5), [4, 1]);
      const after = ok(
        applyAction(normalPool, before, { type: "mode", mode: 4 }),
      ).plan;
      assert.equal(after.mode, 4);
      assertValid(normalPool, after);
      for (const index of [4, 1]) {
        const lockedSlot = before.dishes[index]!;
        assert.ok(
          after.dishes.some((slot) => slot.id === lockedSlot.id && slot.locked),
        );
      }
    }
  });

  it("五切四而鎖定非湯菜多於四道時回無解，維持原模式與套餐", () => {
    const before = withLocks(drawn(1, 5), [0, 1, 2, 3, 4]);
    const result = fail(
      applyAction(normalPool, before, { type: "mode", mode: 4 }),
    );
    assert.deepEqual(result.plan, before);
    assert.equal(result.plan.mode, 5);
    assert.match(result.reason, /解鎖/);
  });
});

describe("可重現性與不可變", () => {
  const script: Action[] = [
    reroll,
    { type: "toggle", target: 1 },
    { type: "replace", target: 0 },
    { type: "mode", mode: 5 },
    { type: "replace", target: "soup" },
    reroll,
    { type: "mode", mode: 4 },
  ];

  function run(seed: number): Plan[] {
    let plan = createPlan(seed);
    const history: Plan[] = [];
    for (const action of script) {
      const result = applyAction(normalPool, plan, action);
      plan = result.plan;
      history.push(plan);
    }
    return history;
  }

  it("同初始種子與同動作序列得到同結果", () => {
    assert.deepEqual(run(42), run(42));
  });

  it("不同種子會產生不同結果", () => {
    const seen = new Set(
      Array.from({ length: 20 }, (_, seed) => JSON.stringify(run(seed))),
    );
    assert.ok(seen.size > 1);
  });

  it("成功的隨機動作推進種子", () => {
    const before = createPlan(10);
    const after = ok(applyAction(normalPool, before, reroll)).plan;
    assert.notEqual(after.seed, before.seed);
  });

  it("輸入的候選池與套餐不被變更（成功與無解皆然）", () => {
    const pool = normalPool.map((c) => Object.freeze({ ...c }));
    Object.freeze(pool);
    const plan = drawn(3);
    const frozen: Plan = Object.freeze({
      ...plan,
      dishes: Object.freeze(
        plan.dishes.map((slot) => Object.freeze({ ...slot })),
      ) as Plan["dishes"],
      soup: Object.freeze({ ...plan.soup! }),
    });
    const snapshot = structuredClone(frozen);
    const actions: Action[] = [
      reroll,
      { type: "mode", mode: 5 },
      { type: "replace", target: 0 },
      { type: "replace", target: "soup" },
      { type: "toggle", target: 0 },
    ];
    for (const action of actions) applyAction(pool, frozen, action);
    const locked = withLocks(plan, [0, 1, 2, 3]);
    const lockedSnapshot = structuredClone(locked);
    applyAction(pool, locked, { type: "replace", target: 0 });
    assert.deepEqual(frozen, snapshot);
    assert.deepEqual(locked, lockedSnapshot);
  });

  it("無解時 plan 內容等同原輸入", () => {
    const before = drawn(1, 5);
    const locked = withLocks(before, [0, 1, 2, 3, 4]);
    const result = fail(
      applyAction(normalPool, locked, { type: "mode", mode: 4 }),
    );
    assert.deepEqual(result.plan, locked);
  });
});

describe("性質測試：200 個種子的動作序列", () => {
  it("平衡、不重複、鎖定保留恆成立", () => {
    for (let seed = 0; seed < 200; seed++) {
      let plan = createPlan(seed, seed % 2 === 0 ? 4 : 5);
      const actions: Action[] = [
        reroll,
        { type: "toggle", target: seed % 4 },
        { type: "toggle", target: "soup" },
        reroll,
        { type: "replace", target: (seed + 1) % 4 },
        { type: "replace", target: "soup" },
        { type: "mode", mode: seed % 2 === 0 ? 5 : 4 },
        { type: "replace", target: seed % 4 },
        reroll,
      ];
      for (const action of actions) {
        const result = applyAction(normalPool, plan, action);
        if (result.ok && plan.dishes.length > 0) {
          for (const slot of plan.dishes.filter((s) => s.locked)) {
            if (action.type === "mode" && action.mode < plan.mode) continue;
            assert.ok(
              result.plan.dishes.some((s) => s.id === slot.id && s.locked),
              `種子 ${seed}：鎖定項遺失`,
            );
          }
        }
        plan = result.plan;
        if (plan.dishes.length > 0) assertValid(normalPool, plan);
      }
    }
  });
});

describe("失效套餐（isPlanUsable）", () => {
  const slot = (id: string, locked = false) => ({ id, locked });
  const stale = (result: Result, original: Plan) => {
    const failed = fail(result);
    assert.match(failed.reason, /重新抽選/);
    assert.deepEqual(failed.plan, original);
  };

  it("引擎產生的套餐與空套餐都可用", () => {
    assert.equal(isPlanUsable(normalPool, createPlan(1)), true);
    assert.equal(isPlanUsable(normalPool, drawn(2)), true);
    assert.equal(isPlanUsable(normalPool, drawn(2, 5)), true);
  });

  it("鎖定的非湯菜放在湯位時不可用，重抽回無解", () => {
    const pool = [veg("v1"), pro("p1"), plain("n1"), plain("n2"), soup("s")];
    const plan: Plan = { mode: 4, dishes: [], soup: slot("n1", true), seed: 1 };
    assert.equal(isPlanUsable(pool, plan), false);
    stale(applyAction(pool, plan, reroll), plan);
  });

  it("湯放在菜位時不可用，重抽回無解", () => {
    const pool = [
      veg("v1"),
      pro("p1"),
      plain("n1"),
      plain("n2"),
      soup("s"),
      soup("t"),
    ];
    const plan: Plan = {
      mode: 4,
      dishes: [slot("t", true)],
      soup: null,
      seed: 1,
    };
    assert.equal(isPlanUsable(pool, plan), false);
    stale(applyAction(pool, plan, reroll), plan);
  });

  it("同一道菜重複出現時不可用，不能繞過平衡", () => {
    const pool = [
      both("x"),
      plain("a"),
      plain("b"),
      plain("c"),
      plain("d"),
      soup("s"),
      soup("t"),
    ];
    const plan: Plan = {
      mode: 4,
      dishes: [slot("x", true), slot("x", true), slot("a"), slot("b")],
      soup: slot("s"),
      seed: 1,
    };
    assert.equal(isPlanUsable(pool, plan), false);
    stale(applyAction(pool, plan, reroll), plan);
  });

  it("菜數與模式不符時不可用，替換回無解", () => {
    const pool = [veg("v1"), pro("p1"), plain("a"), plain("b"), soup("s")];
    const plan: Plan = {
      mode: 5,
      dishes: [slot("v1"), slot("p1")],
      soup: slot("s"),
      seed: 1,
    };
    assert.equal(isPlanUsable(pool, plan), false);
    stale(applyAction(pool, plan, { type: "replace", target: 0 }), plan);
  });

  it("只有湯、沒有菜的半成品套餐不可用", () => {
    const plan: Plan = {
      mode: 4,
      dishes: [],
      soup: slot("radish-soup"),
      seed: 1,
    };
    assert.equal(isPlanUsable(normalPool, plan), false);
  });

  it("鎖定的湯已不在候選池時，重抽回無解", () => {
    const plan: Plan = { ...drawn(1), soup: slot("gone", true) };
    assert.equal(isPlanUsable(normalPool, plan), false);
    stale(applyAction(normalPool, plan, reroll), plan);
  });

  it("含失效菜色時，替換湯也回無解", () => {
    const base = drawn(1);
    const plan: Plan = {
      ...base,
      dishes: [slot("gone"), ...base.dishes.slice(1)],
    };
    stale(
      applyAction(normalPool, plan, { type: "replace", target: "soup" }),
      plan,
    );
  });

  it("重抽、換模式、替換、切換鎖定對失效套餐一致地回無解", () => {
    const base = drawn(1);
    const plan: Plan = {
      ...base,
      dishes: [slot("gone"), ...base.dishes.slice(1)],
    };
    const actions: Action[] = [
      reroll,
      { type: "mode", mode: 5 },
      { type: "replace", target: 1 },
      { type: "replace", target: "soup" },
      { type: "toggle", target: 1 },
      { type: "toggle", target: "soup" },
    ];
    for (const action of actions) {
      stale(applyAction(normalPool, plan, action), plan);
    }
  });
});

describe("鎖定菜被擠出時的位置", () => {
  it("五切四時第五位的鎖定菜改填最後一個空位", () => {
    for (let seed = 0; seed < 30; seed++) {
      const before = withLocks(drawn(seed, 5), [4, 1]);
      const after = ok(
        applyAction(normalPool, before, { type: "mode", mode: 4 }),
      ).plan;
      assert.deepEqual(after.dishes[3], before.dishes[4]);
      assert.deepEqual(after.dishes[1], before.dishes[1]);
    }
  });
});

describe("成功路徑不與輸入共用參照", () => {
  it("每個成功動作都回傳新的 dishes 陣列、slot 與 soup 物件", () => {
    const before = withLocks(drawn(5), [0], true);
    const actions: Action[] = [
      reroll,
      { type: "mode", mode: 5 },
      { type: "replace", target: 1 },
      { type: "replace", target: 2 },
      { type: "toggle", target: 0 },
      { type: "toggle", target: "soup" },
    ];
    for (const action of actions) {
      const { plan } = ok(applyAction(normalPool, before, action));
      assert.notEqual(plan.dishes, before.dishes);
      plan.dishes.forEach((slot) => {
        assert.ok(!before.dishes.includes(slot), "slot 不得共用");
      });
      assert.notEqual(plan.soup, before.soup);
    }
    const unlocked = withLocks(drawn(5), []);
    const soupReplace = ok(
      applyAction(normalPool, unlocked, { type: "replace", target: "soup" }),
    ).plan;
    assert.notEqual(soupReplace.dishes, unlocked.dishes);
    soupReplace.dishes.forEach((slot) =>
      assert.ok(!unlocked.dishes.includes(slot)),
    );
  });
});
