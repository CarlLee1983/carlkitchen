import type { DishKind, RecipeCategory } from "../content/recipe-schema";

/** 篩選值：網址參數 `kind` 的值，也是 Pagefind 篩選屬性 `kind` 的值。 */
export type KindFilter = "all" | DishKind | "staple" | "soup";

export const KIND_PARAM = "kind";

/** 篩選與菜譜標籤共用相同文字，避免名稱不一致。 */
const KIND_LABELS: Record<Exclude<KindFilter, "all">, string> = {
  vegetable: "蔬菜",
  meat: "肉類",
  seafood: "海鮮",
  "egg-bean": "蛋豆",
  staple: "主食",
  soup: "湯",
};

/** 篩選選項的固定順序與中文標籤。 */
const KIND_OPTIONS: readonly { value: KindFilter; label: string }[] = [
  { value: "all", label: "全部" },
  ...Object.entries(KIND_LABELS).map(([value, label]) => ({
    value: value as Exclude<KindFilter, "all">,
    label,
  })),
];

/** 缺少、無法辨識或不在目前顯示的選項（`visible`）中的值一律視為全部。 */
export function parseKindParam(
  value: string | null,
  visible: readonly KindFilter[],
): KindFilter {
  return visible.find((kind) => kind === value) ?? "all";
}

interface KindSource {
  category: RecipeCategory;
  dishKinds: readonly DishKind[];
}

/** 菜譜屬於哪些篩選值（不含 all）；雙主角同時屬於各類，配桌角色不參與。 */
export function recipeKinds(recipe: KindSource): Exclude<KindFilter, "all">[] {
  switch (recipe.category) {
    case "湯":
      return ["soup"];
    case "主食":
      return ["staple"];
    case "非湯料理":
      return [...recipe.dishKinds];
    default:
      // 分類列舉新增值時，這裡會在型別檢查時報錯，提醒補上對應的篩選值
      return recipe.category satisfies never;
  }
}

/** 清單與菜譜頁呈現的主角標籤。 */
export function recipeKindLabels(recipe: KindSource): string[] {
  return recipeKinds(recipe).map((kind) => KIND_LABELS[kind]);
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

/** 展開數量在 `history.state` 裡的欄位名。 */
export const SAVED_COUNT_KEY = "showMoreCount";

/** 離開首頁前的捲動位置在 `history.state` 裡的欄位名。 */
export const SAVED_SCROLL_KEY = "showMoreScrollY";

function readStateField(state: unknown, key: string): unknown {
  if (typeof state !== "object" || state === null) return undefined;
  return (state as Record<string, unknown>)[key];
}

/**
 * 從 `history.state`（外部資料，型別不可信）讀出保存的展開數量；
 * 只有正整數才採用，其餘一律視為沒有保存值。
 */
export function readSavedCount(state: unknown): number | undefined {
  const value = readStateField(state, SAVED_COUNT_KEY);
  return Number.isInteger(value) && (value as number) > 0
    ? (value as number)
    : undefined;
}

/** 讀出保存的捲動位置；只有有限且不小於 0 的數字才採用。 */
export function readSavedScroll(state: unknown): number | undefined {
  const value = readStateField(state, SAVED_SCROLL_KEY);
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
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

/** 從 Pagefind 結果網址（`/topics/<識別值>/`）取出專題識別值；不是專題頁回傳 null。 */
export function topicIdFromUrl(url: string): string | null {
  return url.match(/^\/topics\/([^/]+)\/?$/)?.[1] ?? null;
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

/** 首頁菜譜清單每批顯示的列數預設值；建置時可用 `HOME_BATCH_SIZE` 覆寫（僅供 e2e 使用）。 */
export const DEFAULT_BATCH_SIZE = 20;

/** 解析建置環境變數 `HOME_BATCH_SIZE`：未設定或空字串用預設值，其餘必須是正整數，否則丟錯讓建置失敗。 */
export function parseBatchSize(raw: string | undefined): number {
  if (raw === undefined || raw === "") return DEFAULT_BATCH_SIZE;
  if (!/^[1-9]\d*$/.test(raw)) {
    throw new Error(
      `HOME_BATCH_SIZE 必須是正整數，收到「${raw}」（未設定時預設 ${DEFAULT_BATCH_SIZE}）。`,
    );
  }
  return Number(raw);
}

/** 顯示更多的截斷結果。 */
export interface Truncation {
  /** 實際顯示的列數。 */
  shown: number;
  /** 被收起的列數。 */
  remaining: number;
  /** 下一次按鈕要再顯示的列數；沒有剩餘時為 0。 */
  nextCount: number;
}

/**
 * 依可見列總數、每批數量與目前要顯示的數量算出截斷結果。
 * `requested` 未設定時顯示一批；其餘夾在 min(一批, 總數) 與總數之間。呼叫端只傳整數。
 */
export function truncateRows(
  total: number,
  batch: number,
  requested?: number,
): Truncation {
  const lower = Math.min(batch, total);
  const shown = Math.min(Math.max(requested ?? batch, lower), total);
  const remaining = total - shown;
  return { shown, remaining, nextCount: Math.min(batch, remaining) };
}

/** 按一次「顯示更多」後的狀態；`firstNewIndex` 是新出現第一列在可見列中的位置，沒有新列時為 null。 */
export interface ShowMoreStep extends Truncation {
  firstNewIndex: number | null;
}

/** 在目前截斷結果之上再顯示一批。 */
export function showMore(
  total: number,
  batch: number,
  requested?: number,
): ShowMoreStep {
  const before = truncateRows(total, batch, requested);
  const next = truncateRows(total, batch, before.shown + before.nextCount);
  return {
    ...next,
    firstNewIndex: next.shown > before.shown ? before.shown : null,
  };
}
