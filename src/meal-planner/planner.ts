import { isBalanced } from "./balance.ts";
import { createRng, type Rng } from "./random.ts";
import { isPlanUsable } from "./usable.ts";
import type { Action, Candidate, Plan, Result, Slot } from "./types.ts";

const NEED_DRAW = "請先抽選套餐。";

/** 尚未抽選的空套餐。 */
export function createPlan(seed: number, mode: 4 | 5 = 4): Plan {
  return { mode, dishes: [], soup: null, seed: seed >>> 0 };
}

/**
 * 對候選池與目前套餐套用一個動作。純函式：不變更任何輸入；
 * 無解時回傳的 `plan` 內容與輸入相同。隨機性只來自 `plan.seed`，
 * 每個成功的隨機動作（重抽、換模式、替換）都會推進種子。
 */
export function applyAction(
  pool: readonly Candidate[],
  plan: Plan,
  action: Action,
): Result {
  if (!isPlanUsable(pool, plan)) return refuse(plan, STALE);
  switch (action.type) {
    case "reroll":
      return draw(pool, plan, plan.mode);
    case "mode":
      return draw(pool, plan, action.mode);
    case "replace":
      return replace(pool, plan, action.target);
    case "toggle":
      return toggle(plan, action.target);
  }
}

const refuse = (plan: Plan, reason: string): Result => ({
  ok: false,
  plan: structuredClone(plan),
  reason,
});

function slotAt(plan: Plan, target: number | "soup"): Slot | null {
  return target === "soup" ? plan.soup : (plan.dishes[target] ?? null);
}

function toggle(plan: Plan, target: number | "soup"): Result {
  const slot = slotAt(plan, target);
  if (!slot) return refuse(plan, NEED_DRAW);
  const flipped: Slot = { ...slot, locked: !slot.locked };
  const dishes = plan.dishes.map((item, i) =>
    i === target ? flipped : { ...item },
  );
  const next: Plan = {
    ...plan,
    dishes,
    soup: target === "soup" ? flipped : plan.soup && { ...plan.soup },
  };
  const label = target === "soup" ? "湯" : "菜色";
  return {
    ok: true,
    plan: next,
    message: flipped.locked ? `${label}已鎖定。` : `${label}已解鎖。`,
  };
}

const STALE = "目前套餐含已不在候選池的菜色；請重新抽選。";

type Pick = { dishes: Candidate[] } | { failure: string };

/**
 * 從 `free` 挑 `need` 道菜，與已鎖定的菜合起來須平衡，且盡量少用 `previous`
 * 裡的菜：由少到多嘗試沿用的舊菜數，第一個可行的數量即最小重疊。
 * 平衡最多需要補一道蔬菜與一道蛋白質，所以只列舉 0 到 2 道的「核心」，
 * 其餘位置再隨機補滿，不必列舉全部組合。
 */
function pickDishes(
  rng: Rng,
  free: readonly Candidate[],
  locked: readonly Candidate[],
  need: number,
  previous: ReadonlySet<string>,
): Pick {
  if (free.length < need) {
    return { failure: "候選池的非湯菜不足，無法組成完整且不重複的套餐。" };
  }
  const fresh = free.filter((item) => !previous.has(item.id));
  const stale = free.filter((item) => previous.has(item.id));

  const coreSets: Candidate[][] = isBalanced(locked) ? [[]] : [];
  if (coreSets.length === 0) {
    for (const a of free) {
      if (isBalanced([...locked, a])) coreSets.push([a]);
    }
    for (let i = 0; i < free.length; i++) {
      for (let j = i + 1; j < free.length; j++) {
        const pair = [free[i]!, free[j]!];
        if (isBalanced([...locked, ...pair])) coreSets.push(pair);
      }
    }
  }

  for (let reused = 0; reused <= need; reused++) {
    const wantFresh = need - reused;
    if (fresh.length < wantFresh || stale.length < reused) continue;
    const cores = coreSets.filter((core) => {
      const coreStale = core.filter((item) => previous.has(item.id)).length;
      return core.length - coreStale <= wantFresh && coreStale <= reused;
    });
    if (cores.length === 0) continue;
    const core = rng.pick(cores);
    const inCore = new Set(core.map((item) => item.id));
    const coreStale = core.filter((item) => previous.has(item.id)).length;
    const restFresh = rng
      .shuffle(fresh.filter((item) => !inCore.has(item.id)))
      .slice(0, wantFresh - (core.length - coreStale));
    const restStale = rng
      .shuffle(stale.filter((item) => !inCore.has(item.id)))
      .slice(0, reused - coreStale);
    return { dishes: rng.shuffle([...core, ...restFresh, ...restStale]) };
  }
  return {
    failure:
      locked.length > 0
        ? "鎖定的菜色無法與其他候選組成一道蔬菜菜加另一道蛋白質菜。"
        : "候選池缺少蔬菜菜或另一道蛋白質菜，無法組成均衡套餐。",
  };
}

/**
 * 鎖定的菜留在原位置（刻意偏離原型，保持 replace／toggle 索引穩定）；
 * 超出新菜位數而被擠出的鎖定菜從最後一個空位往前填，其餘依序填入剩下的空位。
 */
function arrange(
  mode: number,
  lockedSlots: readonly { index: number; slot: Slot }[],
  fill: readonly string[],
): Slot[] {
  const slots: (Slot | null)[] = Array.from({ length: mode }, () => null);
  const displaced: Slot[] = [];
  for (const { index, slot } of lockedSlots) {
    if (index < mode) slots[index] = { ...slot };
    else displaced.push({ ...slot });
  }
  for (const slot of displaced) {
    slots[slots.lastIndexOf(null)] = slot;
  }
  const queue = fill.map((id): Slot => ({ id, locked: false }));
  return slots.map((slot) => slot ?? queue.shift()!);
}

function draw(pool: readonly Candidate[], plan: Plan, mode: 4 | 5): Result {
  const lookup = new Map(pool.map((item) => [item.id, item]));
  const lockedSlots = plan.dishes
    .map((slot, index) => ({ index, slot }))
    .filter(({ slot }) => slot.locked);
  if (lockedSlots.length > mode) {
    return refuse(
      plan,
      `鎖定的非湯菜多於 ${mode} 道；請先解鎖至少一道再切換。`,
    );
  }
  const lockedDishes = lockedSlots.map(({ slot }) => lookup.get(slot.id)!);
  const lockedSoup = plan.soup?.locked ? plan.soup : null;

  const rng = createRng(plan.seed);
  rng.next(); // 動作一定推進種子，即使沒有任何位置需要抽

  const soups = pool.filter((item) => item.soup);
  if (!lockedSoup && soups.length === 0) {
    return refuse(plan, "候選池沒有湯，無法組成套餐。");
  }
  const lockedIds = new Set(lockedSlots.map(({ slot }) => slot.id));
  const free = pool.filter((item) => !item.soup && !lockedIds.has(item.id));
  const previous = new Set(
    plan.dishes.filter((slot) => !slot.locked).map((slot) => slot.id),
  );
  const picked = pickDishes(
    rng,
    free,
    lockedDishes,
    mode - lockedSlots.length,
    previous,
  );
  if ("failure" in picked) return refuse(plan, picked.failure);

  let soupSlot: Slot;
  if (lockedSoup) {
    soupSlot = { ...lockedSoup };
  } else {
    const previousSoup = plan.soup?.id;
    const others = soups.filter((item) => item.id !== previousSoup);
    soupSlot = {
      id: rng.pick(others.length > 0 ? others : soups).id,
      locked: false,
    };
  }

  const dishes = arrange(
    mode,
    lockedSlots,
    picked.dishes.map((item) => item.id),
  );
  const next: Plan = { mode, dishes, soup: soupSlot, seed: rng.seed };
  const sameIds = (a: readonly Slot[], b: readonly Slot[]) =>
    a.length === b.length &&
    [...a.map((s) => s.id)].sort().join() ===
      [...b.map((s) => s.id)].sort().join();
  const unchanged =
    mode === plan.mode &&
    sameIds(dishes, plan.dishes) &&
    soupSlot.id === plan.soup?.id;
  return {
    ok: true,
    plan: next,
    message: unchanged
      ? "可用候選無法換出新組合；保留原套餐。"
      : "已抽選；鎖定的菜色保留，未鎖定的盡量換新。",
  };
}

function replace(
  pool: readonly Candidate[],
  plan: Plan,
  target: number | "soup",
): Result {
  const old = slotAt(plan, target);
  if (!old) return refuse(plan, NEED_DRAW);
  if (old.locked) return refuse(plan, "此菜色已鎖定；請先解鎖才能替換。");

  const lookup = new Map(pool.map((item) => [item.id, item]));
  const used = new Set([
    ...plan.dishes.map((slot) => slot.id),
    ...(plan.soup ? [plan.soup.id] : []),
  ]);
  const rng = createRng(plan.seed);
  rng.next();

  if (target === "soup") {
    const available = pool.filter((item) => item.soup && !used.has(item.id));
    if (available.length === 0) {
      return refuse(plan, "沒有其他可替換的湯；原湯保留。");
    }
    const id = rng.pick(available).id;
    return {
      ok: true,
      plan: {
        ...plan,
        dishes: plan.dishes.map((slot) => ({ ...slot })),
        soup: { id, locked: false },
        seed: rng.seed,
      },
      message: "只替換了湯，其他菜色保持原樣。",
    };
  }

  const current = plan.dishes.map((slot) => lookup.get(slot.id)!);
  const available = pool.filter(
    (item) =>
      !item.soup &&
      !used.has(item.id) &&
      isBalanced(current.map((dish, i) => (i === target ? item : dish))),
  );
  if (available.length === 0) {
    return refuse(plan, "沒有不重複且符合平衡規則的替換菜色；原菜保留。");
  }
  const id = rng.pick(available).id;
  return {
    ok: true,
    plan: {
      ...plan,
      dishes: plan.dishes.map((slot, i) =>
        i === target ? { id, locked: false } : { ...slot },
      ),
      soup: plan.soup && { ...plan.soup },
      seed: rng.seed,
    },
    message: "只替換了一道菜，其他菜色保持原樣。",
  };
}
