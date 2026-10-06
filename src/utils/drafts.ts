export interface WithDraft {
  data: { draft: boolean };
}

/** 草稿只在開發模式出現；正式建置的頁面與清單一律排除。 */
export function filterDrafts<T extends WithDraft>(
  entries: T[],
  includeDrafts: boolean,
): T[] {
  return entries.filter((entry) => includeDrafts || !entry.data.draft);
}
