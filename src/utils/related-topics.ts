interface RelatedTopic {
  id: string;
  data: {
    draft: boolean;
    publishedAt: Date;
    relatedRecipes: string[];
  };
}

/** 只從已發布專題的相關菜譜反查，依發布日期與識別值穩定排序。 */
export function getRelatedTopics<T extends RelatedTopic>(
  recipeId: string,
  topics: readonly T[],
): T[] {
  return topics
    .filter(
      (topic) =>
        !topic.data.draft && topic.data.relatedRecipes.includes(recipeId),
    )
    .sort(
      (left, right) =>
        right.data.publishedAt.getTime() - left.data.publishedAt.getTime() ||
        left.id.localeCompare(right.id),
    )
    .slice(0, 3);
}
