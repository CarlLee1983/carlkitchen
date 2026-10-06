import {
  applyHomeState,
  formatDateLabel,
  matchesCategory,
  normalizeQuery,
  parseHomeState,
  recipeIdFromUrl,
  type HomeState,
} from "../utils/home";

/** 建置後由 `pagefind --site dist` 產生；開發模式沒有這份索引。 */
const PAGEFIND_URL = "/pagefind/pagefind.js";
/** 輸入停頓多久才送出搜尋（毫秒）。 */
const DEBOUNCE_MS = 150;

interface PagefindResult {
  data(): Promise<{ url: string }>;
}
interface PagefindResponse {
  results: PagefindResult[];
}
interface PagefindOptions {
  filters?: Record<string, string>;
}
interface Pagefind {
  init(): Promise<void>;
  search(term: string, options?: PagefindOptions): Promise<PagefindResponse>;
  /** 被較新的呼叫取代時回傳 null。 */
  debouncedSearch(
    term: string,
    options: PagefindOptions,
    wait: number,
  ): Promise<PagefindResponse | null>;
}

let pagefindPromise: Promise<Pagefind> | undefined;

function loadPagefind(): Promise<Pagefind> {
  pagefindPromise ??= import(/* @vite-ignore */ PAGEFIND_URL).catch(
    (error: unknown) => {
      pagefindPromise = undefined; // 下次搜尋再試一次
      throw error;
    },
  );
  return pagefindPromise;
}

/**
 * 首頁互動：日期、搜尋、分類篩選與網址同步。
 * 狀態是 `{ q, category }`，唯一來源是網址。
 * 沒有字詞時完全不載入 Pagefind，清單依建置時的菜名排序；有字詞時依 Pagefind 結果
 * 的相關度重排，分類以 Pagefind 篩選屬性套用。
 */
export function initHome() {
  const today = document.querySelector("[data-today]");
  if (today) today.textContent = formatDateLabel(new Date());

  const form = document.querySelector<HTMLElement>("[data-search-form]");
  const input = document.querySelector<HTMLInputElement>("#search-input");
  const intro = document.querySelector("[data-intro]");
  const status = document.querySelector("#search-status");
  const buttons = [...document.querySelectorAll<HTMLElement>("[data-filter]")];
  const rows = [...document.querySelectorAll<HTMLElement>("[data-recipe-row]")];
  const rowsById = new Map(rows.map((row) => [row.dataset.recipeId, row]));
  const rowList = rows[0]?.parentElement;
  const empty = document.querySelector<HTMLElement>("[data-empty]");
  const emptyMessage = document.querySelector("[data-empty-message]");
  const clearButton = document.querySelector("[data-clear]");

  /** 以 Pagefind 搜尋，回傳依相關度排序的菜譜識別值；被取代時回傳 null。 */
  async function findIds(
    state: HomeState,
    debounce: boolean,
  ): Promise<string[] | null> {
    const pagefind = await loadPagefind();
    const options: PagefindOptions =
      state.category === "all" ? {} : { filters: { category: state.category } };
    const response = debounce
      ? await pagefind.debouncedSearch(state.q, options, DEBOUNCE_MS)
      : await pagefind.search(state.q, options);
    if (!response) return null;
    const pages = await Promise.all(
      response.results.map((result) => result.data()),
    );
    return pages.flatMap((page) => recipeIdFromUrl(page.url) ?? []);
  }

  // 較新的 render 開始後，舊的非同步結果作廢，避免慢的回應蓋掉新的狀態。
  let latest = 0;

  async function render(state: HomeState, debounce = false) {
    const mine = ++latest;
    for (const button of buttons) {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.filter === state.category),
      );
    }
    intro?.toggleAttribute("data-searching", state.q !== "");
    if (input && normalizeQuery(input.value) !== state.q) {
      input.value = state.q;
    }

    let visible: HTMLElement[];
    if (state.q) {
      let ids: string[] | null;
      try {
        ids = await findIds(state, debounce);
      } catch (error) {
        console.error("載入搜尋索引失敗", error);
        if (mine === latest && status) {
          status.textContent = "搜尋暫時無法使用，請重新整理頁面再試。";
        }
        return;
      }
      if (ids === null || mine !== latest) return;
      visible = ids.flatMap((id) => rowsById.get(id) ?? []);
    } else {
      visible = rows.filter((row) =>
        matchesCategory(state.category, row.dataset.category ?? ""),
      );
    }

    const shown = new Set(visible);
    for (const row of rows) row.hidden = !shown.has(row);
    // 重排：顯示的列依結果順序在前，其餘維持原本（菜名）順序。
    rowList?.append(...visible, ...rows.filter((row) => !shown.has(row)));

    if (status) {
      status.textContent = `${state.q ? "符合" : "共"} ${visible.length} 道`;
    }
    if (empty) {
      empty.hidden = visible.length > 0 || rows.length === 0;
      if (emptyMessage) {
        emptyMessage.textContent = state.q
          ? `找不到符合「${state.q}」的菜譜。`
          : "這個分類目前沒有菜譜。";
      }
    }
  }

  /** 以 replaceState 把正規化後的狀態寫回網址，保留 hash。 */
  function writeUrl(state: HomeState) {
    const url = new URL(location.href);
    url.search = applyHomeState(url.searchParams, state).toString();
    history.replaceState(null, "", url);
  }

  function setState(state: HomeState, debounce = false) {
    writeUrl(state);
    void render(state, debounce);
  }

  const currentState = () =>
    parseHomeState(new URL(location.href).searchParams);

  input?.addEventListener("focus", () => {
    // 輸入前先備好索引；沒有索引（開發模式）時等真正搜尋再回報
    void loadPagefind()
      .then((pagefind) => pagefind.init())
      .catch(() => {});
  });
  input?.addEventListener("input", () => {
    setState({ ...currentState(), q: normalizeQuery(input.value) }, true);
  });

  // Enter 不送出表單（會重新載入、丟掉分類），改為立刻套用目前字詞。
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    setState({ ...currentState(), q: normalizeQuery(input?.value ?? "") });
  });

  for (const button of buttons) {
    button.addEventListener("click", () => {
      setState({
        ...currentState(),
        category: parseHomeState(
          new URLSearchParams({ category: button.dataset.filter ?? "" }),
        ).category,
      });
    });
  }

  clearButton?.addEventListener("click", () => {
    setState({ q: "", category: "all" });
    input?.focus();
  });

  // 上一頁／下一頁（含 hash 導航產生的歷史紀錄）：依網址重新還原。
  window.addEventListener("popstate", () => void render(currentState()));

  // 載入時依網址還原；無法辨識的參數值順便從網址清掉。
  setState(currentState());
}
