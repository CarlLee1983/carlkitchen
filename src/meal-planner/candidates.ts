import type { RecipeCategory } from "../content/recipe-schema.ts";
import type { Candidate } from "./types.ts";

/** 轉換所需的最小菜譜形狀；內容集合的項目（`id` 加 `data`）可直接傳入。 */
export interface RecipeLike {
  id: string;
  data: {
    category: RecipeCategory;
    draft: boolean;
    mealCandidate: boolean;
    vegetable: boolean;
    protein: boolean;
  };
}

/**
 * 把公開菜譜轉成配菜候選池：只留已發布、標為配菜候選且分類為非湯料理或湯者，保持輸入順序。
 * 主食一律排除（候選池層的防線，不依賴 schema 已擋下主食的 `mealCandidate`）。
 */
export function candidatesFromRecipes(
  recipes: readonly RecipeLike[],
): Candidate[] {
  return recipes
    .filter(({ data }) => data.mealCandidate && !data.draft)
    .flatMap(({ id, data }): Candidate[] => {
      switch (data.category) {
        case "非湯料理":
        case "湯":
          return [
            {
              id,
              soup: data.category === "湯",
              vegetable: data.vegetable,
              protein: data.protein,
            },
          ];
        case "主食":
          return [];
        default:
          // 分類列舉新增值時，這裡會在型別檢查時報錯，提醒決定它能否進候選池
          return data.category satisfies never;
      }
    });
}
