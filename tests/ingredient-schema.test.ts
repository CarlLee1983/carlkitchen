import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { z } from "astro/zod";
import { createIngredientSchema } from "../src/content/ingredient-schema.ts";

const schema = createIngredientSchema(z.string());
const cabbage = {
  title: "高麗菜",
  summary: "臺灣常見的葉菜。",
  category: "vegetable",
  draft: true,
  selection: "看外葉與切口。",
  preparation: "逐葉洗淨。",
  storage: "包好後冷藏。",
  uses: "適合清炒。",
  season: {
    production: [
      { area: "平地", months: "10 月至翌年 5 月" },
      { area: "高冷地", months: "5 月至 11 月" },
    ],
    bestFlavor: "11 月至翌年 4 月",
    scope: "臺灣；產地與年度會影響實際月份。",
  },
  relatedRecipes: ["stir-fried-cabbage"],
} as const;

describe("食材條目 schema", () => {
  it("接受完整蔬菜草稿且圖片可省略", () => {
    assert.equal(schema.safeParse(cabbage).success, true);
  });

  it("蔬菜必填臺灣產期、賞味期與範圍", () => {
    const result = schema.safeParse({ ...cabbage, season: undefined });
    assert.equal(result.success, false);
    if (!result.success) {
      assert.ok(
        result.error.issues.some((issue) => issue.path[0] === "season"),
      );
    }
  });

  it("非蔬菜不必填產期，但仍要有選用、處理、保存、用途與相關菜譜", () => {
    const seasoning = { ...cabbage, category: "seasoning", season: undefined };
    assert.equal(schema.safeParse(seasoning).success, true);
    const result = schema.safeParse({
      ...seasoning,
      uses: "",
      relatedRecipes: [],
    });
    assert.equal(result.success, false);
  });

  it("有圖片時必填替代文字", () => {
    const result = schema.safeParse({
      ...cabbage,
      hero: { src: "hero.webp", alt: "" },
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
});
