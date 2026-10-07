import { getCollection, type CollectionEntry } from "astro:content";
import { filterDrafts } from "./drafts";

export type IngredientEntry = CollectionEntry<"ingredients">;

/** 開發預覽含草稿，正式建置只產生已發布食材條目。 */
export async function getVisibleIngredientEntries(): Promise<
  IngredientEntry[]
> {
  return filterDrafts(await getCollection("ingredients"), import.meta.env.DEV);
}
