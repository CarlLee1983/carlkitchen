/** 首頁分類篩選：網址參數 `category` 的值；缺少或無法辨識一律視為全部。 */
export type CategoryFilter = "all" | "non-soup" | "soup";

export const CATEGORY_PARAM = "category";

const FILTERS: readonly CategoryFilter[] = ["all", "non-soup", "soup"];

export function parseCategoryParam(value: string | null): CategoryFilter {
  return FILTERS.find((filter) => filter === value) ?? "all";
}

/** 首頁的網址狀態：搜尋字詞 q（票 05 使用）與分類。 */
export interface HomeState {
  q: string;
  category: CategoryFilter;
}

export function parseHomeState(params: URLSearchParams): HomeState {
  return {
    q: params.get("q") ?? "",
    category: parseCategoryParam(params.get(CATEGORY_PARAM)),
  };
}

/** 回傳新的參數：預設值（空 q、全部）不寫進網址，其他參數原樣保留。 */
export function applyHomeState(
  params: URLSearchParams,
  state: HomeState,
): URLSearchParams {
  const next = new URLSearchParams(params);
  if (state.q) next.set("q", state.q);
  else next.delete("q");
  if (state.category === "all") next.delete(CATEGORY_PARAM);
  else next.set(CATEGORY_PARAM, state.category);
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

/** 例如「10 月 6 日　週二」，用讀者裝置的本地日期。 */
export function formatDateLabel(date: Date): string {
  const weekday = "日一二三四五六"[date.getDay()];
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日　週${weekday}`;
}
