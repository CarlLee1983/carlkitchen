import type { HomeRecommendation } from "../content/home-recommendation.ts";

export interface HomeTopic {
  id: string;
  homeFallback?: boolean;
  homeRecommendation?: HomeRecommendation;
}

/** 順位數字越小越優先；台北日曆日與起訖日均包含當日，跨年檔期以月日比較。 */
export function selectHomeTopic(
  topics: readonly HomeTopic[],
  now = new Date(),
): string | undefined {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) =>
    parts.find((entry) => entry.type === type)!.value;
  const monthDay = `${part("month")}-${part("day")}`;
  const date = `${part("year")}-${monthDay}`;
  const active = topics.filter(({ homeRecommendation: period }) => {
    if (!period) return false;
    if (period.kind === "dated")
      return date >= period.start && date <= period.end;
    return period.start <= period.end
      ? monthDay >= period.start && monthDay <= period.end
      : monthDay >= period.start || monthDay <= period.end;
  });
  active.sort(
    (left, right) =>
      left.homeRecommendation!.priority - right.homeRecommendation!.priority ||
      left.id.localeCompare(right.id),
  );
  return active[0]?.id ?? topics.find((topic) => topic.homeFallback)?.id;
}

/** 跨專題的編輯設定檢查；無備選合法，但不能讓草稿成為有效推薦。 */
export function homeTopicIssues(
  topics: readonly (HomeTopic & { draft: boolean })[],
): { id: string; message: string }[] {
  const issues: { id: string; message: string }[] = [];
  let fallback: string | undefined;
  const priorities = new Map<number, string>();
  for (const topic of topics) {
    if (topic.draft && (topic.homeFallback || topic.homeRecommendation)) {
      issues.push({
        id: topic.id,
        message: "首頁推薦與常青備選只能指定已發布專題。",
      });
    }
    if (topic.homeFallback) {
      if (fallback)
        issues.push({
          id: topic.id,
          message: `常青備選只能有一篇，已指定「${fallback}」。`,
        });
      fallback = topic.id;
    }
    if (topic.homeRecommendation) {
      const priority = topic.homeRecommendation.priority;
      const existing = priorities.get(priority);
      if (existing)
        issues.push({
          id: topic.id,
          message: `推薦順位 ${priority} 與「${existing}」重複，請指定不同順位。`,
        });
      priorities.set(priority, topic.id);
    }
  }
  return issues;
}
