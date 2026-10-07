export const FAVORITES_KEY = "carlkitchen:favorites:v1";

/** 收藏只存菜譜識別值；舊資料或手動修改的內容不應成為任意網址。 */
export function parseFavoriteIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return [
      ...new Set(
        parsed.filter(
          (id): id is string =>
            typeof id === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id),
        ),
      ),
    ];
  } catch {
    return [];
  }
}

export function readFavoriteIds(): string[] | null {
  try {
    return parseFavoriteIds(localStorage.getItem(FAVORITES_KEY));
  } catch {
    return null;
  }
}

/** 寫入失敗時不改畫面，避免看起來已收藏但重新整理後消失。 */
export function setFavorite(id: string, saved: boolean): string[] | null {
  const ids = readFavoriteIds();
  if (ids === null) return null;
  const next = saved
    ? [...new Set([...ids, id])]
    : ids.filter((item) => item !== id);
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    return next;
  } catch {
    return null;
  }
}
