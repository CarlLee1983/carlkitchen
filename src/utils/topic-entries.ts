import { getCollection, type CollectionEntry } from "astro:content";
import { filterDrafts } from "./drafts";

export type TopicEntry = CollectionEntry<"topics">;

/** 開發預覽含草稿，正式建置只產生已發布專題；依發布日期由新到舊，同日以識別值排序。 */
export async function getVisibleTopicEntries(): Promise<TopicEntry[]> {
  const entries = filterDrafts(
    await getCollection("topics"),
    import.meta.env.DEV,
  );
  return entries.sort(
    (left, right) =>
      right.data.publishedAt.getTime() - left.data.publishedAt.getTime() ||
      left.id.localeCompare(right.id),
  );
}

/** 發布日期是不含時區的日曆日（frontmatter 的 YAML 日期解析為 UTC 零點），一律以 UTC 取值避免差一天。 */
export function formatPublishedDate(date: Date): {
  iso: string;
  label: string;
} {
  return {
    iso: date.toISOString().slice(0, 10),
    label: `${date.getUTCFullYear()} 年 ${date.getUTCMonth() + 1} 月 ${date.getUTCDate()} 日`,
  };
}
