import {
  DEFAULT_INGREDIENT_GROUP,
  SEASONING_GROUP,
  UNSPECIFIED_AMOUNT_LABEL,
} from "../content/recipe-schema.ts";

/** 頁面上沒有指定分組的材料所屬組別的標題。 */
export const MAIN_GROUP_LABEL = "主料";

interface GroupableIngredient {
  group?: string | undefined;
}

export interface IngredientGroup<T> {
  label: string;
  items: T[];
}

/**
 * 材料分成「主料」與其他組（通常是「調味」）：保留各組內的原始順序，
 * 主料固定排最前，調味固定排最後，其餘依首次出現順序居中；空組不產生。
 * 回傳新結構，不改動輸入。
 */
export function groupIngredients<T extends GroupableIngredient>(
  ingredients: readonly T[],
): IngredientGroup<T>[] {
  const byName = new Map<string, T[]>();
  for (const ingredient of ingredients) {
    const name = ingredient.group ?? DEFAULT_INGREDIENT_GROUP;
    byName.set(name, [...(byName.get(name) ?? []), ingredient]);
  }
  const rank = (name: string) =>
    name === DEFAULT_INGREDIENT_GROUP ? 0 : name === SEASONING_GROUP ? 2 : 1;
  return [...byName]
    .sort(([a], [b]) => rank(a) - rank(b))
    .map(([name, items]) => ({
      label: name === DEFAULT_INGREDIENT_GROUP ? MAIN_GROUP_LABEL : name,
      items,
    }));
}

export function formatAmount(
  amount: { value: number; unit: string } | undefined,
): string {
  return amount ? `${amount.value} ${amount.unit}` : UNSPECIFIED_AMOUNT_LABEL;
}
