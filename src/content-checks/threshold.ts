import {
  applyAction,
  candidatesFromRecipes,
  createPlan,
  type RecipeLike,
} from "../meal-planner/index.ts";
import type { Issue } from "./issue.ts";

export const MIN_DISHES = 12;
export const MIN_SOUPS = 3;

/** 部署前檢查候選數量與可抽性；使用同一引擎，避免只夠數量卻缺少組餐角色。 */
export function checkLaunchThreshold(recipes: readonly RecipeLike[]): Issue[] {
  const pool = candidatesFromRecipes(recipes);
  const soups = pool.filter((candidate) => candidate.soup).length;
  const dishes = pool.length - soups;
  const issues: Issue[] = [];
  const report = (label: string, count: number, min: number) => {
    if (count < min) {
      issues.push({
        message: `${label}配菜候選 ${count}／${min}，缺 ${min - count} 道。`,
      });
    }
  };
  report("非湯料理", dishes, MIN_DISHES);
  report("湯", soups, MIN_SOUPS);
  // 數量不足已列出缺額，不再重複回報兩種套餐都無法抽選。
  if (issues.length > 0) return issues;

  const failures = ([4, 5] as const).flatMap((mode) => {
    const result = applyAction(pool, createPlan(0, mode), { type: "reroll" });
    return result.ok
      ? []
      : [{ mode: mode === 4 ? "四菜一湯" : "五菜一湯", reason: result.reason }];
  });
  if (failures.length > 0) {
    const modes = failures.map(({ mode }) => mode).join("、");
    const reasons = [...new Set(failures.map(({ reason }) => reason))].join(
      " ",
    );
    issues.push({ message: `${modes}無法抽選：${reasons}` });
  }
  return issues;
}
