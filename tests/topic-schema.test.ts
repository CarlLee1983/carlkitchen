import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createTopicSchema,
  TOPIC_ID_PATTERN,
} from "../src/content/topic-schema.ts";

const schema = createTopicSchema();
const topic = {
  title: "夏天的涼拌菜",
  summary: "三種十分鐘內完成的涼拌做法。",
  draft: false,
  publishedAt: "2026-09-01",
} as const;

describe("專題 schema", () => {
  it("接受完整欄位，日期轉成 Date", () => {
    const result = schema.safeParse(topic);
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(
        result.data.publishedAt.toISOString(),
        "2026-09-01T00:00:00.000Z",
      );
    }
  });

  it("也接受 YAML frontmatter 解析出的 Date 物件", () => {
    const result = schema.safeParse({
      ...topic,
      publishedAt: new Date("2026-09-01"),
    });
    assert.equal(result.success, true);
  });

  it("標題與短介不得空白", () => {
    for (const field of ["title", "summary"] as const) {
      const result = schema.safeParse({ ...topic, [field]: "  " });
      assert.equal(result.success, false);
      if (!result.success) {
        assert.ok(result.error.issues.some((issue) => issue.path[0] === field));
      }
    }
  });

  it("draft 必填且須為布林值", () => {
    assert.equal(
      schema.safeParse({ ...topic, draft: undefined }).success,
      false,
    );
    assert.equal(schema.safeParse({ ...topic, draft: "false" }).success, false);
  });

  it("發布日期必填且須為有效日期", () => {
    assert.equal(
      schema.safeParse({ ...topic, publishedAt: undefined }).success,
      false,
    );
    assert.equal(
      schema.safeParse({ ...topic, publishedAt: "not-a-date" }).success,
      false,
    );
  });

  it("識別值格式和菜譜相同：小寫英數字以連字號分隔", () => {
    for (const id of ["summer-salads", "a1", "topic2"]) {
      assert.match(id, TOPIC_ID_PATTERN);
    }
    for (const id of ["Summer", "a_b", "-a", "a-", "a--b", "專題", ""]) {
      assert.doesNotMatch(id, TOPIC_ID_PATTERN);
    }
  });
});
