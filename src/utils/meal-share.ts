import { isCompletePlan } from "../meal-planner/index.ts";
import type { Candidate, Plan } from "../meal-planner/index.ts";

const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** 公開連結只存菜數、依序的菜譜識別值與湯；不存分頁私有狀態。 */
export function encodeSharedMeal(
  plan: Plan,
  pool: readonly Candidate[],
): string | null {
  if (
    !isCompletePlan(pool, plan) ||
    [...plan.dishes.map((slot) => slot.id), plan.soup!.id].some(
      (id) => !slug.test(id),
    )
  )
    return null;
  const value = `v1.${plan.mode}.${plan.dishes.map((slot) => slot.id).join(",")}.${plan.soup!.id}`;
  return value.length <= 2048 ? value : null;
}

export type DecodedMeal =
  { ok: true; plan: Plan } | { ok: false; reason: string };

export function decodeSharedMeal(
  value: string,
  pool: readonly Candidate[],
): DecodedMeal {
  if (value.length > 2048)
    return { ok: false, reason: "菜單連結過長，無法開啟。" };
  if (/^v\d+\./.test(value) && !value.startsWith("v1."))
    return { ok: false, reason: "不支援這個版本的菜單連結。" };
  const parts = value.split(".");
  if (
    parts.length !== 4 ||
    parts[0] !== "v1" ||
    !["4", "5"].includes(parts[1]!)
  )
    return { ok: false, reason: "菜單連結格式不正確。" };
  const mode = Number(parts[1]) as 4 | 5;
  const dishIds = parts[2]!.split(",");
  const soupId = parts[3]!;
  if (
    dishIds.length !== mode ||
    !dishIds.every((id) => slug.test(id)) ||
    !slug.test(soupId)
  )
    return { ok: false, reason: "菜單連結的菜色資料不正確。" };
  const ids = [...dishIds, soupId];
  if (new Set(ids).size !== ids.length)
    return { ok: false, reason: "菜單連結有重複菜色。" };
  const lookup = new Map(pool.map((candidate) => [candidate.id, candidate]));
  if (ids.some((id) => !lookup.has(id)))
    return {
      ok: false,
      reason: "菜單中的菜色已下架或不再提供配菜，無法開啟。",
    };
  if (dishIds.some((id) => lookup.get(id)!.soup) || !lookup.get(soupId)!.soup)
    return { ok: false, reason: "菜單連結的菜色或湯分類不正確。" };
  const plan: Plan = {
    mode,
    dishes: dishIds.map((id) => ({ id, locked: false })),
    soup: { id: soupId, locked: false },
    seed: 0,
  };
  if (!isCompletePlan(pool, plan))
    return {
      ok: false,
      reason: "菜單需要一道以蔬菜為主的料理，以及另一道肉、海鮮或蛋豆料理。",
    };
  return { ok: true, plan };
}
