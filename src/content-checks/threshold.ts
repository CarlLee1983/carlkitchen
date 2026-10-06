import {
  candidatesFromRecipes,
  type RecipeLike,
} from "../meal-planner/index.ts";
import type { Issue } from "./issue.ts";

export const MIN_DISHES = 12;
export const MIN_SOUPS = 3;

/** 候選池門檻（部署前）：沿用配菜引擎的候選池規則計數，未達時列出缺額。 */
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
  return issues;
}
