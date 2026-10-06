import type { RECIPE_CATEGORIES } from "../content/recipe-schema.ts";
import type { Candidate } from "./types.ts";

/** 轉換所需的最小菜譜形狀；內容集合的項目（`id` 加 `data`）可直接傳入。 */
export interface RecipeLike {
  id: string;
  data: {
    category: (typeof RECIPE_CATEGORIES)[number];
    draft: boolean;
    mealCandidate: boolean;
    vegetable: boolean;
    protein: boolean;
  };
}

/** 把公開菜譜轉成配菜候選池：只留已發布且標為配菜候選者，保持輸入順序。 */
export function candidatesFromRecipes(
  recipes: readonly RecipeLike[],
): Candidate[] {
  return recipes
    .filter(({ data }) => data.mealCandidate && !data.draft)
    .map(({ id, data }) => ({
      id,
      soup: data.category === "湯",
      vegetable: data.vegetable,
      protein: data.protein,
    }));
}
