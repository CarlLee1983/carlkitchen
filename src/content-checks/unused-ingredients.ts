import type { Issue } from "./issue.ts";
import type { Recipe } from "./recipes.ts";

/**
 * 步驟常以簡稱帶過、不會逐字寫出材料名的項目：
 * 油類寫成「油」「倒油」，外鍋水寫成「外鍋加水」，水寫成「加水」。
 * 這些與材料名字面不同，比對會一律誤報，所以略過。
 */
export const ALWAYS_USED_NAMES: ReadonlySet<string> = new Set([
  "食用油",
  "沙拉油",
  "炸油",
  "油",
  "外鍋水",
  "水",
]);

// 畜種前綴：「豬肥肉」在步驟常寫成「肥肉」。
const SPECIES_PREFIX = /^[豬牛雞鴨羊]/;
// 全形與半形括號連同其內文：括號內是品種或部位說明，步驟不一定重述。
const PARENTHESES = /[（(][^）)]*[）)]/g;
// note 裡的切法別名：「切成蔥花」→「蔥花」、「切絲」→「絲」。
const CUT_ALIAS = /切成?([^，、,；;。\s（）()]+)/g;
// note 片段的分隔符號。
const NOTE_SEPARATORS = /[，、,；;]/;

type RecipeLike = Pick<Recipe, "steps"> & {
  ingredients: { name: string; note?: string }[];
};

/** 材料在步驟中可能出現的所有寫法（字面比對用）。 */
function candidateTerms(name: string, note: string | undefined): string[] {
  const base = name.replace(PARENTHESES, "").trim();
  const terms = [base];
  if (SPECIES_PREFIX.test(base) && base.length > 1) terms.push(base.slice(1));
  if (note) {
    for (const match of note.matchAll(CUT_ALIAS)) terms.push(match[1]!);
    // 分組標籤（「調味 A」「醃料」）：note 以分隔符號切開的各片段。
    // 切法片段已由別名處理，不當標籤。
    terms.push(
      ...note
        .split(NOTE_SEPARATORS)
        .map((part) => part.trim())
        .filter((part) => part && !part.startsWith("切")),
    );
  }
  return terms.filter(Boolean);
}

/** 材料表有、步驟文字完全沒用到的材料；警告級，不屬於失敗。 */
export function findUnusedIngredients(id: string, recipe: RecipeLike): Issue[] {
  const stepsText = recipe.steps.map((step) => step.text).join("\n");
  return recipe.ingredients.flatMap((ingredient, index) => {
    if (ALWAYS_USED_NAMES.has(ingredient.name.trim())) return [];
    const used = candidateTerms(ingredient.name, ingredient.note).some((term) =>
      stepsText.includes(term),
    );
    if (used) return [];
    return [
      {
        recipe: id,
        field: `ingredients.${index}`,
        message: `材料「${ingredient.name}」在步驟中沒有用到（警告）。`,
      },
    ];
  });
}
