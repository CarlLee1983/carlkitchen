import { getCollection, type CollectionEntry } from "astro:content";
import { filterDrafts } from "./drafts";
import { sortByTitle } from "./recipe-list";

export type Recipe = CollectionEntry<"recipes">;

/** 可見菜譜：開發模式含草稿，正式建置只有已發布，依標題（繁中）排序。 */
export async function getVisibleRecipes(): Promise<Recipe[]> {
  const entries = await getCollection("recipes");
  return sortByTitle(filterDrafts(entries, import.meta.env.DEV));
}

export function recipeHref(recipe: Recipe): string {
  return `/recipes/${recipe.id}/`;
}
