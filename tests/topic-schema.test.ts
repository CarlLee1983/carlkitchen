import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { z } from "astro/zod";
import {
  createTopicSchema,
  TOPIC_ID_PATTERN,
} from "../src/content/topic-schema.ts";

const schema = createTopicSchema(z.string());
const topic = {
  title: "夏天的涼拌菜",
  summary: "三種十分鐘內完成的涼拌做法。",
  draft: false,
  publishedAt: "2026-09-01",
  hero: { src: "hero.webp", alt: "涼拌小黃瓜的成品" },
  relatedRecipes: ["tomato-egg"],
  relatedIngredients: ["tomato"],
  references: [
    { author: "某作者", title: "某文章", url: "https://example.com/a" },
  ],
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

  it("草稿可以沒有封面，已發布專題缺封面時失敗", () => {
    assert.equal(
      schema.safeParse({ ...topic, draft: true, hero: undefined }).success,
      true,
    );
    const result = schema.safeParse({ ...topic, hero: undefined });
    assert.equal(result.success, false);
    if (!result.success) {
      assert.ok(result.error.issues.some((issue) => issue.path[0] === "hero"));
    }
  });

  it("封面替代文字必填", () => {
    const result = schema.safeParse({
      ...topic,
      hero: { src: "hero.webp", alt: " " },
    });
    assert.equal(result.success, false);
    if (!result.success) {
      assert.ok(
        result.error.issues.some(
          (issue) => issue.path.join(".") === "hero.alt",
        ),
      );
    }
  });

  it("相關菜譜與食材可為空，識別值格式錯誤時失敗", () => {
    assert.equal(
      schema.safeParse({
        ...topic,
        relatedRecipes: [],
        relatedIngredients: [],
      }).success,
      true,
    );
    for (const field of ["relatedRecipes", "relatedIngredients"] as const) {
      const result = schema.safeParse({ ...topic, [field]: ["Tomato Egg"] });
      assert.equal(result.success, false);
      if (!result.success) {
        assert.ok(result.error.issues.some((issue) => issue.path[0] === field));
      }
    }
  });

  it("相關菜譜與食材欄位必填，沒有時要寫空陣列", () => {
    for (const field of ["relatedRecipes", "relatedIngredients"] as const) {
      assert.equal(
        schema.safeParse({ ...topic, [field]: undefined }).success,
        false,
      );
    }
  });

  it("選題參考每筆要有作者、標題與 http(s) 網址，可為空", () => {
    assert.equal(schema.safeParse({ ...topic, references: [] }).success, true);
    const reference = topic.references[0];
    for (const bad of [
      { ...reference, author: "" },
      { ...reference, title: " " },
      { ...reference, url: "not a url" },
      { ...reference, url: "javascript:alert(1)" },
      { ...reference, url: "ftp://example.com/a" },
    ]) {
      assert.equal(
        schema.safeParse({ ...topic, references: [bad] }).success,
        false,
      );
    }
    assert.equal(
      schema.safeParse({
        ...topic,
        references: [{ ...reference, url: "http://example.com/a" }],
      }).success,
      true,
    );
  });
});
