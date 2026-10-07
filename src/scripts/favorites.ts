import {
  FAVORITES_KEY,
  readFavoriteIds,
  setFavorite,
} from "../utils/favorites";

export function initRecipeFavorite() {
  const button =
    document.querySelector<HTMLButtonElement>("[data-favorite-id]");
  const state = document.querySelector<HTMLElement>("[data-favorite-state]");
  const error = document.querySelector<HTMLElement>("[data-favorite-error]");
  if (!button) return;
  const id = button.dataset.favoriteId;
  if (!id) return;
  const favoriteButton = button;
  const recipeId = id;

  function render() {
    const ids = readFavoriteIds();
    if (ids === null) {
      favoriteButton.hidden = true;
      if (state) state.hidden = true;
      if (error) error.textContent = "無法讀取收藏，請檢查瀏覽器儲存設定。";
      return;
    }
    const saved = ids.includes(recipeId);
    favoriteButton.hidden = false;
    favoriteButton.setAttribute("aria-pressed", String(saved));
    if (state) {
      state.hidden = false;
      state.textContent = saved ? "已收藏" : "尚未收藏";
    }
    if (error) error.textContent = "";
  }

  button.addEventListener("click", () => {
    const saved = button.getAttribute("aria-pressed") === "true";
    if (setFavorite(recipeId, !saved) === null) {
      if (error) error.textContent = "無法儲存收藏，請檢查瀏覽器儲存設定。";
      return;
    }
    render();
  });
  window.addEventListener("storage", (event) => {
    if (event.key === FAVORITES_KEY || event.key === null) render();
  });
  window.addEventListener("pageshow", render);
  render();
}

export function initFavoritesPage() {
  const list = document.querySelector<HTMLElement>("[data-favorites-list]");
  const status = document.querySelector<HTMLElement>("[data-favorites-status]");
  if (!list || !status) return;
  const favoritesList = list;
  const favoritesStatus = status;
  const rows = [
    ...favoritesList.querySelectorAll<HTMLElement>("[data-favorite-row]"),
  ];

  function render() {
    const ids = readFavoriteIds();
    favoritesStatus.hidden = false;
    if (ids === null) {
      favoritesList.hidden = true;
      favoritesStatus.textContent = "無法讀取收藏，請檢查瀏覽器儲存設定。";
      return;
    }
    const saved = new Set(ids);
    let count = 0;
    for (const row of rows) {
      row.hidden = !saved.has(row.dataset.favoriteRow ?? "");
      if (!row.hidden) count++;
    }
    favoritesList.hidden = count === 0;
    favoritesStatus.textContent =
      count === 0 ? "還沒有收藏的菜譜。" : `已收藏 ${count} 道菜譜。`;
  }

  favoritesList.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest<HTMLButtonElement>("button[data-remove-id]");
    const id = button?.dataset.removeId;
    if (!id) return;
    if (setFavorite(id, false) === null) {
      favoritesStatus.textContent = "無法儲存收藏，請檢查瀏覽器儲存設定。";
      return;
    }
    render();
  });
  window.addEventListener("storage", (event) => {
    if (event.key === FAVORITES_KEY || event.key === null) render();
  });
  window.addEventListener("pageshow", render);
  render();
}
