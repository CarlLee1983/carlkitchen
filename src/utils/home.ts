/** 首頁分類篩選：網址參數 `category` 的值；缺少或無法辨識一律視為全部。 */
export type CategoryFilter = "all" | "non-soup" | "soup";

export const CATEGORY_PARAM = "category";

const FILTERS: readonly CategoryFilter[] = ["all", "non-soup", "soup"];

export function parseCategoryParam(value: string | null): CategoryFilter {
  return FILTERS.find((filter) => filter === value) ?? "all";
}

/** 搜尋字詞去掉前後空白；只有空白視為沒有字詞。 */
export const normalizeQuery = (value: string): string => value.trim();

/** 首頁的網址狀態：搜尋字詞 q 與分類。 */
export interface HomeState {
  q: string;
  category: CategoryFilter;
}

export function parseHomeState(params: URLSearchParams): HomeState {
  return {
    q: normalizeQuery(params.get("q") ?? ""),
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

/**
 * 菜譜分類值（「非湯料理」或「湯」）對應的篩選值：同時是網址 `category` 參數值
 * 與 Pagefind 篩選值（`data-pagefind-filter="category:…"`）。
 */
export function categoryFilterValue(
  recipeCategory: string,
): Exclude<CategoryFilter, "all"> {
  return recipeCategory === "湯" ? "soup" : "non-soup";
}

/** 例如「10 月 6 日　週二」，用讀者裝置的本地日期。 */
export function formatDateLabel(date: Date): string {
  const weekday = "日一二三四五六"[date.getDay()];
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日　週${weekday}`;
}

/** 從 Pagefind 結果網址（`/recipes/<識別值>/`）取出菜譜識別值；不是菜譜頁回傳 null。 */
export function recipeIdFromUrl(url: string): string | null {
  return url.match(/^\/recipes\/([^/]+)\/?$/)?.[1] ?? null;
}

const segmenter = new Intl.Segmenter("zh-Hant", { granularity: "word" });

const normalizeContent = (text: string) =>
  text.replaceAll("​", "").toLowerCase();

/**
 * 查詢切成字詞後，每個字詞都要出現在內容中才算符合。
 * Pagefind 對多字中文查詢在全部字詞都找不到時會退回部分匹配，等於自動放寬條件；
 * 這裡在它的結果上再做一次全字詞過濾（內容含 Pagefind 插入的零寬空白，先去掉）。
 */
export function containsAllTerms(content: string, q: string): boolean {
  const haystack = normalizeContent(content);
  return [...segmenter.segment(normalizeContent(q))]
    .filter((part) => part.isWordLike)
    .every((part) => haystack.includes(part.segment));
}
