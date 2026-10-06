import { readdirSync, readFileSync } from "node:fs";
import { parse } from "yaml";

export interface MealFixture {
  id: string;
  title: string;
  soup: boolean;
  vegetable: boolean;
  protein: boolean;
}

/**
 * 讀取某個固定菜譜根目錄中「已發布且標為配菜候選」的菜，
 * 與頁面的候選池規則相同；測試的數量與菜名都由這裡推得。
 */
export function mealCandidates(root: string): MealFixture[] {
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const raw = parse(
        readFileSync(`${root}/${entry.name}/recipe.yaml`, "utf8"),
      ) as {
        title: string;
        category: string;
        draft: boolean;
        mealCandidate?: boolean;
        vegetable?: boolean;
        protein?: boolean;
      };
      if (raw.draft || !raw.mealCandidate) return [];
      return [
        {
          id: entry.name,
          title: raw.title,
          soup: raw.category === "湯",
          vegetable: raw.vegetable ?? false,
          protein: raw.protein ?? false,
        },
      ];
    });
}
