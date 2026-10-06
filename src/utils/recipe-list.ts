/** 依標題（繁中）排序；回傳新陣列，不改動輸入。 */
export function sortByTitle<T extends { data: { title: string } }>(
  entries: T[],
): T[] {
  return [...entries].sort((left, right) =>
    left.data.title.localeCompare(right.data.title, "zh-Hant"),
  );
}
