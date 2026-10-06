import { isPlanUsable } from "../meal-planner/index.ts";
import type { Candidate, Plan, Slot } from "../meal-planner/index.ts";

/** 同一分頁保存套餐的 sessionStorage 鍵；內容是 `serializePlan` 的輸出。 */
export const MEAL_STORAGE_KEY = "carlkitchen-meal-plan";

export type Restored =
  | { kind: "none" }
  | { kind: "restored"; plan: Plan }
  /** 有保存內容但已不可用（損毀或菜譜不在目前候選池）；呼叫端應清除並請讀者重抽。 */
  | { kind: "stale" };

export function serializePlan(plan: Plan): string {
  return JSON.stringify(plan);
}

const isSlot = (value: unknown): value is Slot =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as Slot).id === "string" &&
  typeof (value as Slot).locked === "boolean";

/** 保存的內容來自外部儲存，先確認形狀，再交給引擎的 `isPlanUsable` 判斷是否仍合法。 */
function parsePlan(raw: string): Plan | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null) return null;
  const { mode, dishes, soup, seed } = value as Record<string, unknown>;
  if (mode !== 4 && mode !== 5) return null;
  if (!Array.isArray(dishes) || !dishes.every(isSlot)) return null;
  if (soup !== null && !isSlot(soup)) return null;
  if (typeof seed !== "number" || !Number.isFinite(seed)) return null;
  return { mode, dishes, soup, seed };
}

export function restorePlan(
  raw: string | null,
  pool: readonly Candidate[],
): Restored {
  if (raw === null) return { kind: "none" };
  const plan = parsePlan(raw);
  if (!plan || !isPlanUsable(pool, plan)) return { kind: "stale" };
  return { kind: "restored", plan };
}
