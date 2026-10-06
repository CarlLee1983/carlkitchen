import {
  applyHomeState,
  formatDateLabel,
  matchesCategory,
  parseHomeState,
  type HomeState,
} from "../utils/home";

/**
 * 首頁互動：日期、搜尋表單、分類篩選與網址同步。
 * 狀態是 `{ q, category }`，唯一來源是網址；票 05 在 `render` 加上 q 的篩選、
 * 在輸入事件中呼叫 `setState` 即可。
 */
export function initHome() {
  const today = document.querySelector("[data-today]");
  if (today) today.textContent = formatDateLabel(new Date());

  // 搜尋框目前只是外觀，Enter 不送出表單（避免重新載入、丟掉分類參數）。
  document
    .querySelector("[data-search-form]")
    ?.addEventListener("submit", (event) => event.preventDefault());

  const buttons = [...document.querySelectorAll<HTMLElement>("[data-filter]")];
  const rows = [...document.querySelectorAll<HTMLElement>("[data-recipe-row]")];
  const countEl = document.querySelector("[data-count]");

  function render(state: HomeState) {
    let visible = 0;
    for (const row of rows) {
      const show = matchesCategory(state.category, row.dataset.category ?? "");
      row.hidden = !show;
      if (show) visible += 1;
    }
    for (const button of buttons) {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.filter === state.category),
      );
    }
    if (countEl) countEl.textContent = String(visible);
  }

  /** 以 replaceState 把正規化後的狀態寫回網址，保留 hash。 */
  function writeUrl(state: HomeState) {
    const url = new URL(location.href);
    url.search = applyHomeState(url.searchParams, state).toString();
    history.replaceState(null, "", url);
  }

  function setState(state: HomeState) {
    render(state);
    writeUrl(state);
  }

  const currentState = () =>
    parseHomeState(new URL(location.href).searchParams);

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

  // 上一頁／下一頁（含 hash 導航產生的歷史紀錄）：依網址重新還原。
  window.addEventListener("popstate", () => render(currentState()));

  // 載入時依網址還原；無法辨識的參數值順便從網址清掉。
  setState(currentState());
}
