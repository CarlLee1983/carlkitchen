import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isDraft, parseRecipe } from "../src/content-checks/recipes.ts";

const published = () => ({
  title: "範例",
  summary: "摘要",
  servings: 2,
  category: "非湯料理",
  vegetable: true,
  draft: false,
  ingredients: [{ name: "蛋", amount: { value: 2, unit: "顆" } }],
  steps: [{ text: "炒。", image: { src: "./s.webp", alt: "步驟圖" } }],
  hero: { src: "./hero.webp", alt: "成品" },
  ingredientsPhoto: { src: "./ing.webp", alt: "材料" },
});

describe("parseRecipe", () => {
  it("合法菜譜通過並回傳解析後資料", () => {
    const { data, issues } = parseRecipe("alpha", published());
    assert.deepEqual(issues, []);
    assert.equal(data?.title, "範例");
  });

  it("schema 錯誤指出菜譜識別值與欄位", () => {
    const raw = { ...published(), servings: 0 };
    const { data, issues } = parseRecipe("alpha", raw);
    assert.equal(data, undefined);
    assert.equal(issues[0]?.recipe, "alpha");
    assert.equal(issues[0]?.field, "servings");
  });

  it("已發布菜譜缺成品圖時指出 hero", () => {
    const raw: Record<string, unknown> = published();
    delete raw.hero;
    const { issues } = parseRecipe("alpha", raw);
    assert.ok(issues.some((issue) => issue.field === "hero"));
  });

  it("圖片缺替代文字時指出該圖的 alt 欄位", () => {
    const raw = { ...published(), hero: { src: "./hero.webp", alt: "" } };
    const { issues } = parseRecipe("alpha", raw);
    assert.ok(issues.some((issue) => issue.field === "hero.alt"));
  });

  it("草稿可以缺圖", () => {
    const raw: Record<string, unknown> = { ...published(), draft: true };
    delete raw.hero;
    assert.deepEqual(parseRecipe("alpha", raw).issues, []);
  });
});

describe("isDraft", () => {
  it("以 draft 欄位為準，無法解析時不當成草稿", () => {
    assert.equal(isDraft({ draft: true }), true);
    assert.equal(isDraft({ draft: false }), false);
    assert.equal(isDraft(null), false);
    assert.equal(isDraft("x"), false);
  });
});
