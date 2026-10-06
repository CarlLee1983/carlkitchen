/** 首頁分類篩選：網址參數 `category` 的值；缺少或無法辨識一律視為全部。 */
export type CategoryFilter = "all" | "non-soup" | "soup";

export const CATEGORY_PARAM = "category";

const FILTERS: readonly CategoryFilter[] = ["all", "non-soup", "soup"];

export function parseCategoryParam(value: string | null): CategoryFilter {
  return FILTERS.find((filter) => filter === value) ?? "all";
}

/** 回傳新的參數：選「全部」時移除 category，其他參數（如搜尋字詞 q）原樣保留。 */
export function applyCategoryParam(
  params: URLSearchParams,
  filter: CategoryFilter,
): URLSearchParams {
  const next = new URLSearchParams(params);
  if (filter === "all") next.delete(CATEGORY_PARAM);
  else next.set(CATEGORY_PARAM, filter);
  return next;
}

/** `recipeCategory` 是菜譜資料裡的分類值（「非湯料理」或「湯」）。 */
export function matchesCategory(
  filter: CategoryFilter,
  recipeCategory: string,
): boolean {
  if (filter === "all") return true;
  return (filter === "soup") === (recipeCategory === "湯");
}

/** 在 `length` 個候選中選一個索引；沒有候選回傳 -1。`random` 可注入以便測試。 */
export function pickRandomIndex(
  length: number,
  random: () => number = Math.random,
): number {
  if (length <= 0) return -1;
  return Math.min(length - 1, Math.floor(random() * length));
}

/** 例如「10 月 6 日　週二」，用讀者裝置的本地日期。 */
export function formatDateLabel(date: Date): string {
  const weekday = "日一二三四五六"[date.getDay()];
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日　週${weekday}`;
}
