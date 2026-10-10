import { recipeKinds, type KindSource } from "./home.ts";

interface RelatedSource extends KindSource {
  id: string;
  ingredients: readonly { name: string; group?: string }[];
}

/** 每道菜最多列出幾道相關菜譜。 */
const RELATED_LIMIT = 4;

/** 不計分的組名（比對時去掉頭尾空白）。 */
const SKIPPED_GROUPS = new Set(["調味", "醃料"]);

/** 香辛料與水：幾乎每道菜都有，不當作相似的依據。名稱去掉頭尾空白後完全比對。 */
const EXCLUDED_INGREDIENTS = new Set([
  ...["水", "外鍋水", "高湯"],
  ...["蔥", "青蔥", "蔥花", "蔥段"],
  ...["薑", "薑片", "薑絲", "老薑"],
  ...["蒜", "蒜頭", "大蒜", "蒜仁", "蒜末", "蒜泥"],
  ...["辣椒", "紅辣椒", "乾辣椒", "辣椒末"],
  ...["九層塔", "香菜"],
]);

/** 主要材料名稱：扣掉調味、醃料兩組與排除清單，不做同義詞。 */
function mainIngredients(recipe: RelatedSource): Set<string> {
  const names = new Set<string>();
  for (const { name, group } of recipe.ingredients) {
    const trimmed = name.trim();
    if (SKIPPED_GROUPS.has(group?.trim() ?? "")) continue;
    if (EXCLUDED_INGREDIENTS.has(trimmed)) continue;
    names.add(trimmed);
  }
  return names;
}

/** FNV-1a 32 位元雜湊：同分時的穩定排序依據，不依標題。 */
function hash(text: string): number {
  let value = 0x811c9dc5;
  for (const char of text) {
    value ^= char.codePointAt(0)!;
    value = Math.imul(value, 0x01000193) >>> 0;
  }
  return value;
}

/**
 * 每道菜的相關菜譜識別值（最多 4 個）：同組在前，再依雜湊穩定排序。
 * 輸入須已排除草稿；結果不依輸入順序。
 */
export function relatedRecipeIds(
  recipes: readonly RelatedSource[],
): Map<string, string[]> {
  const mains = new Map(recipes.map((r) => [r.id, mainIngredients(r)]));
  const usage = new Map<string, number>();
  for (const names of mains.values()) {
    for (const name of names) usage.set(name, (usage.get(name) ?? 0) + 1);
  }
  // 越少菜用到的材料權重越高（IDF）
  const weight = (name: string) =>
    Math.log(recipes.length / (usage.get(name) ?? 1));

  const result = new Map<string, string[]>();
  for (const recipe of recipes) {
    const keys = new Set(recipeKinds(recipe));
    const own = mains.get(recipe.id)!;
    const candidates = recipes
      .filter((other) => other.id !== recipe.id)
      .map((other) => ({
        id: other.id,
        sameGroup: recipeKinds(other).some((key) => keys.has(key)),
        // 依本篇材料順序加總，浮點誤差才不會讓同分的候選排序不一致
        score: [...own]
          .filter((name) => mains.get(other.id)!.has(name))
          .reduce((total, name) => total + weight(name), 0),
        tie: hash(recipe.id + other.id),
      }))
      .filter(({ sameGroup, score }) => sameGroup || score > 0);
    candidates.sort(
      (left, right) =>
        Number(right.sameGroup) - Number(left.sameGroup) ||
        right.score - left.score ||
        left.tie - right.tie ||
        left.id.localeCompare(right.id),
    );
    result.set(
      recipe.id,
      candidates.slice(0, RELATED_LIMIT).map(({ id }) => id),
    );
  }
  return result;
}
