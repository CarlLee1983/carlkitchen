/** 篩選值：網址參數 `kind` 的值，也是 Pagefind 篩選屬性 `kind` 的值。 */
export type KindFilter = "all" | "vegetable" | "protein" | "soup";

export const KIND_PARAM = "kind";

/** 篩選選項的固定順序與中文標籤。 */
const KIND_OPTIONS: readonly { value: KindFilter; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "vegetable", label: "蔬菜菜" },
  { value: "protein", label: "蛋白質菜" },
  { value: "soup", label: "湯" },
];

/** 缺少、無法辨識或不在目前顯示的選項（`visible`）中的值一律視為全部。 */
export function parseKindParam(
  value: string | null,
  visible: readonly KindFilter[],
): KindFilter {
  return visible.find((kind) => kind === value) ?? "all";
}

interface KindSource {
  category: string;
  vegetable: boolean;
  protein: boolean;
}

/** 菜譜屬於哪些篩選值（不含 all）；兩種性質都有的非湯料理同時屬於兩個。 */
export function recipeKinds(recipe: KindSource): Exclude<KindFilter, "all">[] {
  if (recipe.category === "湯") return ["soup"];
  return [
    ...(recipe.vegetable ? (["vegetable"] as const) : []),
    ...(recipe.protein ? (["protein"] as const) : []),
  ];
}

/** 已發布菜譜要顯示的篩選選項：固定順序，只留至少有一道菜的，全部一律顯示。 */
export function visibleKindOptions(
  recipes: readonly KindSource[],
): { value: KindFilter; label: string }[] {
  const present = new Set(recipes.flatMap(recipeKinds));
  return KIND_OPTIONS.filter(
    (option) =>
      option.value === "all" ||
      present.has(option.value as Exclude<KindFilter, "all">),
  );
}

/** 搜尋字詞去掉前後空白；只有空白視為沒有字詞。 */
export const normalizeQuery = (value: string): string => value.trim();

/** 首頁的網址狀態：搜尋字詞 q 與篩選值 kind。 */
export interface HomeState {
  q: string;
  kind: KindFilter;
}

/** `visible` 是目前顯示的篩選選項值，隱藏的選項視為全部。 */
export function parseHomeState(
  params: URLSearchParams,
  visible: readonly KindFilter[],
): HomeState {
  return {
    q: normalizeQuery(params.get("q") ?? ""),
    kind: parseKindParam(params.get(KIND_PARAM), visible),
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
  if (state.kind === "all") next.delete(KIND_PARAM);
  else next.set(KIND_PARAM, state.kind);
  return next;
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
