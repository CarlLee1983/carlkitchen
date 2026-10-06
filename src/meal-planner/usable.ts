import type { Candidate, Plan } from "./types.ts";

/**
 * 套餐是否仍可交給引擎：菜數等於模式（尚未抽選時菜與湯皆空）、
 * 菜位都是候選池中的非湯菜、湯位是候選池中的湯、全部不重複。
 * 票 07 載入保存的套餐時也用它判斷是否要清除。
 */
export function isPlanUsable(pool: readonly Candidate[], plan: Plan): boolean {
  if (plan.dishes.length === 0 && plan.soup === null) return true;
  if (plan.dishes.length !== plan.mode || plan.soup === null) return false;
  const lookup = new Map(pool.map((item) => [item.id, item]));
  const ids = [...plan.dishes.map((slot) => slot.id), plan.soup.id];
  if (new Set(ids).size !== ids.length) return false;
  return (
    plan.dishes.every((slot) => lookup.get(slot.id)?.soup === false) &&
    lookup.get(plan.soup.id)?.soup === true
  );
}
