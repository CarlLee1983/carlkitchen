import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { z } from "astro/zod";
import { createRecipeSchema } from "../src/content/recipe-schema.ts";

// 單元測試不經 Astro 的 image()，以字串代替圖片欄位，只驗證 schema 規則本身。
const schema = createRecipeSchema(z.string());

const publishedRecipe = () => ({
  title: "番茄炒蛋",
  summary: "蛋先炒到半熟盛起，再把番茄炒出汁，最後合在一起。",
  servings: 2,
  category: "非湯料理",
  draft: false,
  ingredients: [
    { name: "番茄", amount: { value: 2, unit: "顆" }, note: "約 300 g" },
    { name: "鹽", group: "調味" },
  ],
  steps: [
    {
      text: "番茄去蒂切成小塊。",
      image: "step-1.webp",
      imageAlt: "切好的番茄塊",
    },
    { text: "雞蛋打散。" },
  ],
  heroImage: "hero.webp",
  heroAlt: "白瓷盤中盛著番茄炒蛋",
  ingredientsImage: "ingredients.webp",
  ingredientsAlt: "兩顆番茄與三顆雞蛋",
});

const draftRecipe = () => ({
  title: "草稿",
  summary: "還沒寫完。",
  servings: 1,
  category: "湯",
  draft: true,
  ingredients: [{ name: "水", amount: { value: 500, unit: "ml" } }],
  steps: [{ text: "煮滾。" }],
});

const failsAt = (input: unknown, field: string) => {
  const result = schema.safeParse(input);
  assert.equal(result.success, false);
  const paths = result.error!.issues.map((issue) => issue.path.join("."));
  assert.ok(
    paths.some((path) => path === field || path.startsWith(`${field}.`)),
    `預期 ${field} 出錯，實際：${paths.join(", ")}`,
  );
};

describe("recipe schema", () => {
  it("合法的已發布菜譜通過，並補上預設值", () => {
    const result = schema.parse(publishedRecipe());
    assert.equal(result.mealCandidate, false);
    assert.equal(result.vegetable, false);
    assert.equal(result.protein, false);
  });

  it("缺少標題失敗", () => {
    const { title: _title, ...rest } = publishedRecipe();
    failsAt(rest, "title");
  });

  it("份數非正整數失敗", () => {
    for (const servings of [0, -1, 1.5]) {
      failsAt({ ...publishedRecipe(), servings }, "servings");
    }
  });

  it("分類不在列舉內失敗", () => {
    failsAt({ ...publishedRecipe(), category: "甜點" }, "category");
  });

  it("draft 為必填，不可省略", () => {
    const { draft: _draft, ...rest } = publishedRecipe();
    failsAt(rest, "draft");
  });

  it("材料為空失敗", () => {
    failsAt({ ...publishedRecipe(), ingredients: [] }, "ingredients");
  });

  it("做法為空失敗", () => {
    failsAt({ ...publishedRecipe(), steps: [] }, "steps");
  });

  it("材料用量須為正數", () => {
    const ingredients = [{ name: "番茄", amount: { value: 0, unit: "顆" } }];
    failsAt({ ...publishedRecipe(), ingredients }, "ingredients");
  });

  it("「適量」（無用量）只允許出現在調味組", () => {
    const ingredients = [{ name: "番茄" }];
    failsAt({ ...publishedRecipe(), ingredients }, "ingredients.0.amount");
    const otherGroup = [{ name: "鹽", group: "醃料" }];
    failsAt(
      { ...publishedRecipe(), ingredients: otherGroup },
      "ingredients.0.amount",
    );
  });

  it("已發布菜譜缺成品圖、材料合照或步驟圖失敗", () => {
    const { heroImage: _h, ...noHero } = publishedRecipe();
    failsAt(noHero, "heroImage");
    const { ingredientsImage: _i, ...noIngredients } = publishedRecipe();
    failsAt(noIngredients, "ingredientsImage");
    const noStepImage = {
      ...publishedRecipe(),
      steps: [{ text: "番茄去蒂切成小塊。" }],
    };
    failsAt(noStepImage, "steps");
  });

  it("草稿可以沒有任何圖片", () => {
    assert.equal(schema.safeParse(draftRecipe()).success, true);
  });

  it("有圖片就必須有替代文字", () => {
    const { heroAlt: _a, ...noHeroAlt } = publishedRecipe();
    failsAt(noHeroAlt, "heroAlt");
    const { ingredientsAlt: _b, ...noIngredientsAlt } = publishedRecipe();
    failsAt(noIngredientsAlt, "ingredientsAlt");
    const noStepAlt = {
      ...publishedRecipe(),
      steps: [{ text: "切番茄。", image: "step-1.webp" }],
    };
    failsAt(noStepAlt, "steps.0.imageAlt");
    // 草稿一旦放了圖片也要有替代文字
    failsAt({ ...draftRecipe(), heroImage: "hero.webp" }, "heroAlt");
  });
});
