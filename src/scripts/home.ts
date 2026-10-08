import {
  applyHomeState,
  containsAllTerms,
  formatDateLabel,
  normalizeQuery,
  parseHomeState,
  recipeIdFromUrl,
  type HomeState,
  type KindFilter,
} from "../utils/home";

/** 建置後由 `pagefind --site dist` 產生；開發模式沒有這份索引。 */
const PAGEFIND_URL = "/pagefind/pagefind.js";
/** 輸入停頓多久才送出搜尋（毫秒）。 */
const DEBOUNCE_MS = 280;

interface PagefindResult {
  data(): Promise<{ url: string; content: string }>;
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
 * 首頁互動：日期、搜尋、性質篩選與網址同步。
 * 狀態是 `{ q, kind }`，唯一來源是網址。
 * 沒有字詞時完全不載入 Pagefind，清單依建置時的菜名排序；有字詞時依 Pagefind 結果
 * 的相關度重排，篩選值以 Pagefind 篩選屬性套用。
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
      state.kind === "all" ? {} : { filters: { kind: state.kind } };
    const response = debounce
      ? await pagefind.debouncedSearch(state.q, options, DEBOUNCE_MS)
      : await pagefind.search(state.q, options);
    if (!response) return null;
    const pages = await Promise.all(
      response.results.map((result) => result.data()),
    );
    // Pagefind 對多字中文查詢在全部字詞都找不到時會退回部分匹配（等於自動放寬），
    // 所以再以全字詞過濾；排序沿用 Pagefind 的相關度。
    return pages
      .filter((page) => containsAllTerms(page.content, state.q))
      .flatMap((page) => recipeIdFromUrl(page.url) ?? []);
  }

  /** 文字沒變就不重寫，避免朗讀區無謂重播，也不動伺服器預先輸出的內容。 */
  function setText(element: Element | null, text: string) {
    if (element && element.textContent !== text) element.textContent = text;
  }

  // 較新的 render 開始後，舊的非同步結果作廢，避免慢的回應蓋掉新的狀態。
  let latest = 0;

  async function render(state: HomeState, debounce = false) {
    const mine = ++latest;
    for (const button of buttons) {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.filter === state.kind),
      );
    }
    intro?.toggleAttribute(
      "data-has-criteria",
      state.q !== "" || state.kind !== "all",
    );
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
          status.textContent = import.meta.env.DEV
            ? "開發模式沒有搜尋索引，請用 pnpm build && pnpm preview"
            : "搜尋暫時無法使用，請重新整理頁面再試。";
        }
        return;
      }
      if (ids === null || mine !== latest) return;
      visible = ids.flatMap((id) => rowsById.get(id) ?? []);
    } else {
      visible = rows.filter(
        (row) =>
          state.kind === "all" ||
          (row.dataset.kinds ?? "").split(" ").includes(state.kind),
      );
    }

    const shown = new Set(visible);
    for (const row of rows) row.hidden = !shown.has(row);
    // 重排：顯示的列依結果順序在前，其餘維持原本（菜名）順序。
    rowList?.append(...visible, ...rows.filter((row) => !shown.has(row)));

    setText(
      status,
      state.q
        ? `「${state.q}」符合 ${visible.length} 道`
        : `共 ${visible.length} 道`,
    );
    if (empty) {
      empty.hidden = visible.length > 0 || rows.length === 0;
      if (emptyMessage) {
        emptyMessage.textContent = state.q
          ? `找不到符合「${state.q}」的菜譜。`
          : "這個篩選目前沒有菜譜。";
      }
    }
  }

  /** 以 replaceState 把正規化後的狀態寫回網址，保留 hash。 */
  function writeUrl(state: HomeState) {
    const url = new URL(location.href);
    url.search = applyHomeState(url.searchParams, state).toString();
    history.replaceState(null, "", url);
  }

  function setState(state: HomeState, debounce = false): Promise<void> {
    writeUrl(state);
    return render(state, debounce);
  }

  // 建置時沒輸出的選項（沒有已發布菜色）不在按鈕裡，網址帶它視為全部。
  const visibleKinds = buttons.map(
    (button) => button.dataset.filter as KindFilter,
  );
  const currentState = () =>
    parseHomeState(new URL(location.href).searchParams, visibleKinds);

  input?.addEventListener("focus", () => {
    // 輸入前先備好索引；沒有索引（開發模式）時等真正搜尋再回報
    void loadPagefind()
      .then((pagefind) => pagefind.init())
      .catch(() => {});
  });
  const applyInput = () =>
    void setState(
      { ...currentState(), q: normalizeQuery(input?.value ?? "") },
      true,
    );
  // 注音等輸入法組字中的暫存文字不是讀者要搜的字詞；組字結束（compositionend）才更新。
  input?.addEventListener("input", (event) => {
    if ((event as InputEvent).isComposing) return;
    applyInput();
  });
  input?.addEventListener("compositionend", applyInput);

  // Enter 不送出表單（會重新載入、丟掉篩選），改為立刻套用目前字詞。
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    void setState({ ...currentState(), q: normalizeQuery(input?.value ?? "") });
  });

  /**
   * 手機版篩選列固定在頂部；已捲到清單中段時，切換後把清單頂端對齊到篩選列實際的
   * 下緣（折成兩行時列比較高，所以量測而不寫死）。
   */
  const isMobile = window.matchMedia("(max-width: 39.99rem)");
  const bar = document.querySelector(".list-tools");
  function keepListInView() {
    if (!isMobile.matches || !bar || !rowList) return;
    const barRect = bar.getBoundingClientRect();
    if (barRect.top > 0) return;
    window.scrollBy(0, rowList.getBoundingClientRect().top - barRect.bottom);
  }

  for (const button of buttons) {
    button.addEventListener("click", () => {
      // 有搜尋字詞時清單是非同步更新，等結果套用後再對齊
      void setState({
        ...currentState(),
        kind: button.dataset.filter as KindFilter,
      }).then(keepListInView);
    });
  }

  clearButton?.addEventListener("click", () => {
    void setState({ q: "", kind: "all" });
    input?.focus();
  });

  // 上一頁／下一頁（含 hash 導航產生的歷史紀錄）：依網址重新還原。
  window.addEventListener("popstate", () => void render(currentState()));

  // 載入時依網址還原；若為預設狀態（無搜尋字詞且篩選為全部），HTML 結構已完整對應，避免重排與重排清單
  const initial = currentState();
  writeUrl(initial);
  if (initial.q !== "" || initial.kind !== "all") {
    void render(initial);
  }
}
