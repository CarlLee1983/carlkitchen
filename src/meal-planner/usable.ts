import type { Candidate, Plan } from "./types.ts";
import { isBalanced } from "./balance.ts";

/** 尚未抽選的空套餐可交給引擎開始抽選。 */
export function isUndrawnPlan(plan: Plan): boolean {
  return (
    (plan.mode === 4 || plan.mode === 5) &&
    plan.dishes.length === 0 &&
    plan.soup === null
  );
}

/** 完整套餐須有足數的有效候選、正確菜位與由不同菜色滿足的搭配。 */
export function isCompletePlan(
  pool: readonly Candidate[],
  plan: Plan,
): boolean {
  if (plan.mode !== 4 && plan.mode !== 5) return false;
  if (plan.dishes.length !== plan.mode || plan.soup === null) return false;
  const lookup = new Map(pool.map((item) => [item.id, item]));
  const ids = [...plan.dishes.map((slot) => slot.id), plan.soup.id];
  if (new Set(ids).size !== ids.length) return false;
  const dishes: Candidate[] = [];
  for (const slot of plan.dishes) {
    const dish = lookup.get(slot.id);
    if (!dish || dish.soup) return false;
    dishes.push(dish);
  }
  return lookup.get(plan.soup.id)?.soup === true && isBalanced(dishes);
}

/** 引擎只接受未抽選狀態或符合全部規則的完整套餐。 */
export function isPlanUsable(pool: readonly Candidate[], plan: Plan): boolean {
  return isUndrawnPlan(plan) || isCompletePlan(pool, plan);
}
