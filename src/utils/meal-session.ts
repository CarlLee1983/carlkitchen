import {
  isCompletePlan,
  isDraftValid,
  isUndrawnPlan,
} from "../meal-planner/index.ts";
import type { Candidate, Draft, Plan, Slot } from "../meal-planner/index.ts";

/** 同一分頁保存套餐或自選草稿的 sessionStorage 鍵。 */
export const MEAL_STORAGE_KEY = "carlkitchen-meal-plan";

export type Restored =
  | { kind: "none" }
  | { kind: "restored"; plan: Plan }
  | { kind: "restored-draft"; draft: Draft }
  /** 有保存內容但已不可用（損毀或菜譜不在目前候選池）；呼叫端應清除並請讀者重抽。 */
  | { kind: "stale" };

export function serializePlan(plan: Plan): string {
  return JSON.stringify(plan);
}

export function serializeDraft(draft: Draft): string {
  return JSON.stringify({ kind: "draft", draft });
}

const isSlot = (value: unknown): value is Slot =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as Slot).id === "string" &&
  typeof (value as Slot).locked === "boolean";

/** 舊版完整套餐沿用原本格式，先確認形狀再驗證。 */
function parsePlan(value: unknown): Plan | null {
  if (typeof value !== "object" || value === null) return null;
  const { mode, dishes, soup, seed } = value as Record<string, unknown>;
  if (mode !== 4 && mode !== 5) return null;
  if (!Array.isArray(dishes) || !dishes.every(isSlot)) return null;
  if (soup !== null && !isSlot(soup)) return null;
  if (typeof seed !== "number" || !Number.isFinite(seed)) return null;
  return { mode, dishes, soup, seed };
}

function parseDraft(value: unknown): Draft | null {
  if (typeof value !== "object" || value === null) return null;
  const { mode, dishes, soup, seed } = value as Record<string, unknown>;
  if (mode !== 4 && mode !== 5) return null;
  if (
    !Array.isArray(dishes) ||
    dishes.length !== mode ||
    !dishes.every((slot) => slot === null || isSlot(slot))
  )
    return null;
  if (soup !== null && !isSlot(soup)) return null;
  if (typeof seed !== "number" || !Number.isFinite(seed)) return null;
  return { mode, dishes, soup, seed };
}

export function restorePlan(
  raw: string | null,
  pool: readonly Candidate[],
): Restored {
  if (raw === null) return { kind: "none" };
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { kind: "stale" };
  }
  if (
    typeof value === "object" &&
    value !== null &&
    (value as Record<string, unknown>).kind === "draft"
  ) {
    const draft = parseDraft((value as Record<string, unknown>).draft);
    return draft && isDraftValid(pool, draft)
      ? { kind: "restored-draft", draft }
      : { kind: "stale" };
  }
  const plan = parsePlan(value);
  if (!plan || (!isUndrawnPlan(plan) && !isCompletePlan(pool, plan))) {
    return { kind: "stale" };
  }
  return { kind: "restored", plan };
}
