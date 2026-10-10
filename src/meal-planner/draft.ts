import { isBalanced } from "./balance.ts";
import { isCompletePlan } from "./usable.ts";
import type { Candidate, Plan, Slot } from "./types.ts";

/** 自選草稿有固定菜位；null 代表尚未指定，與未抽選套餐不同。 */
export type Draft = {
  mode: 4 | 5;
  dishes: (Slot | null)[];
  soup: Slot | null;
  seed: number;
};

export function createDraft(seed: number, mode: 4 | 5 = 4): Draft {
  return {
    mode,
    dishes: Array.from({ length: mode }, () => null),
    soup: null,
    seed: seed >>> 0,
  };
}

/** 已選菜色須符合目前候選池、菜位角色與互異規則；空位與尚未平衡都允許。 */
export function isDraftValid(
  pool: readonly Candidate[],
  draft: Draft,
): boolean {
  if (
    (draft.mode !== 4 && draft.mode !== 5) ||
    draft.dishes.length !== draft.mode
  )
    return false;
  const lookup = new Map(pool.map((candidate) => [candidate.id, candidate]));
  const chosen = [
    ...draft.dishes.filter((slot): slot is Slot => slot !== null),
    ...(draft.soup ? [draft.soup] : []),
  ];
  if (new Set(chosen.map((slot) => slot.id)).size !== chosen.length)
    return false;
  return (
    draft.dishes.every(
      (slot) => slot === null || lookup.get(slot.id)?.soup === false,
    ) &&
    (draft.soup === null || lookup.get(draft.soup.id)?.soup === true)
  );
}

export type DraftChoiceResult =
  { ok: true; draft: Draft } | { ok: false; draft: Draft; reason: string };

export function applyDraftChoice(
  pool: readonly Candidate[],
  draft: Draft,
  target: number | "soup",
  id: string,
): DraftChoiceResult {
  const refuse = (reason: string): DraftChoiceResult => ({
    ok: false,
    draft: structuredClone(draft),
    reason,
  });
  if (!isDraftValid(pool, draft)) return refuse("自選草稿已失效；請重新開始。");
  if (
    target !== "soup" &&
    (!Number.isInteger(target) || target < 0 || target >= draft.mode)
  )
    return refuse("沒有這個菜位。");
  const old = target === "soup" ? draft.soup : draft.dishes[target]!;
  if (old?.locked) return refuse("此菜色已鎖定；請先解鎖才能指定。");
  const candidate = pool.find((item) => item.id === id);
  if (!candidate) return refuse("這道菜不在目前的配菜候選中。");
  if (candidate.soup !== (target === "soup"))
    return refuse(
      target === "soup" ? "湯位只能指定湯。" : "菜位只能指定非湯料理。",
    );
  if (
    draft.dishes.some((slot, i) => slot?.id === id && i !== target) ||
    (target !== "soup" && draft.soup?.id === id)
  )
    return refuse("同一桌不能有重複菜色。");
  const slot: Slot = { id, locked: false };
  return {
    ok: true,
    draft: {
      ...draft,
      dishes: draft.dishes.map((item, i) =>
        i === target ? slot : item && { ...item },
      ),
      soup: target === "soup" ? slot : draft.soup && { ...draft.soup },
    },
  };
}

export type DraftProgress =
  | { complete: true; plan: Plan; message: string }
  | { complete: false; message: string };

export function draftProgress(
  pool: readonly Candidate[],
  draft: Draft,
): DraftProgress {
  if (!isDraftValid(pool, draft))
    return { complete: false, message: "自選草稿已失效；請重新開始。" };
  const missing = draft.dishes.filter((slot) => slot === null).length;
  const lookup = new Map(pool.map((item) => [item.id, item]));
  const chosen = draft.dishes
    .filter((slot): slot is Slot => slot !== null)
    .map((slot) => lookup.get(slot.id)!);
  const balanced = isBalanced(chosen);
  if (missing === 0 && draft.soup && balanced) {
    const plan: Plan = { ...draft, dishes: draft.dishes as Slot[] };
    if (isCompletePlan(pool, plan))
      return { complete: true, plan, message: "自選菜單已完成。" };
  }
  const needs = [
    missing && `還缺 ${missing} 道非湯料理`,
    !draft.soup && "還缺 1 道湯",
    !chosen.some((item) => item.vegetable) && "還缺一道以蔬菜為主角的料理",
    !chosen.some((item) => item.protein) && "還缺肉蛋料理",
    !balanced &&
      chosen.some((item) => item.vegetable) &&
      chosen.some((item) => item.protein) &&
      "還缺另一道蔬菜或肉蛋料理",
  ].filter(Boolean);
  return { complete: false, message: needs.join("；") + "。" };
}
