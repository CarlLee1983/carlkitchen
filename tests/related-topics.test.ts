import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getRelatedTopics } from "../src/utils/related-topics.ts";

const topic = (
  id: string,
  publishedAt: string,
  relatedRecipes: string[],
  draft = false,
) => ({
  id,
  data: { publishedAt: new Date(publishedAt), relatedRecipes, draft },
});

describe("getRelatedTopics", () => {
  it("只依專題的相關菜譜清單反查，且開發模式也排除草稿", () => {
    const topics = [
      topic("matched", "2026-08-01", ["tomato-egg"]),
      topic("other", "2026-09-01", ["egg-drop-soup"]),
      topic("draft", "2026-10-01", ["tomato-egg"], true),
    ];

    assert.deepEqual(
      getRelatedTopics("tomato-egg", topics).map(({ id }) => id),
      ["matched"],
    );
    assert.deepEqual(getRelatedTopics("missing", topics), []);
  });

  it("先依發布日期由新到舊，再依識別值排序，最多三篇", () => {
    const topics = [
      topic("old", "2026-07-01", ["tomato-egg"]),
      topic("zeta", "2026-09-01", ["tomato-egg"]),
      topic("beta", "2026-09-01", ["tomato-egg"]),
      topic("newest", "2026-10-01", ["tomato-egg"]),
      topic("alpha", "2026-09-01", ["tomato-egg"]),
    ];

    assert.deepEqual(
      getRelatedTopics("tomato-egg", topics).map(({ id }) => id),
      ["newest", "alpha", "beta"],
    );
    assert.equal(topics[0]?.id, "old");
  });
});
