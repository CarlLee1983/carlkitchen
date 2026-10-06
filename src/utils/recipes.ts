import { getCollection, type CollectionEntry } from "astro:content";
import { filterDrafts } from "./drafts";

export type Recipe = CollectionEntry<"recipes">;

/** 可見菜譜：開發模式含草稿，正式建置只有已發布，依標題（繁中）排序。 */
export async function getVisibleRecipes(): Promise<Recipe[]> {
  const entries = await getCollection("recipes");
  return filterDrafts(entries, import.meta.env.DEV).sort((left, right) =>
    left.data.title.localeCompare(right.data.title, "zh-Hant"),
  );
}

export function recipeHref(recipe: Recipe): string {
  return `/recipes/${recipe.id}/`;
}
