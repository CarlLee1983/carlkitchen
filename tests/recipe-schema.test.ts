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
  vegetable: true,
  draft: false,
  timeMinutes: 15,
  ingredients: [
    { name: "番茄", amount: { value: 2, unit: "顆" }, note: "約 300 g" },
    { name: "鹽", group: "調味" },
  ],
  steps: [
    {
      text: "番茄去蒂切成小塊。",
      image: { src: "step-1.webp", alt: "切好的番茄塊" },
    },
    { text: "雞蛋打散。" },
  ],
  hero: { src: "hero.webp", alt: "白瓷盤中盛著番茄炒蛋" },
  ingredientsPhoto: {
    src: "ingredients.webp",
    alt: "兩顆番茄與三顆雞蛋",
  },
});

const draftRecipe = () => ({
  title: "草稿",
  summary: "還沒寫完。",
  servings: 1,
  category: "湯",
  draft: true,
  timeMinutes: 10,
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
    assert.equal(result.protein, false);
  });

  it("非湯料理至少要是蔬菜菜或蛋白質菜之一", () => {
    for (const marks of [{ vegetable: true }, { protein: true }]) {
      const { vegetable: _v, ...base } = publishedRecipe();
      assert.equal(schema.safeParse({ ...base, ...marks }).success, true);
    }
    assert.equal(
      schema.safeParse({ ...publishedRecipe(), vegetable: true, protein: true })
        .success,
      true,
    );
    const neither = { ...publishedRecipe(), vegetable: false, protein: false };
    failsAt(neither, "vegetable");
    failsAt(neither, "protein");
  });

  it("湯的蔬菜菜與蛋白質菜標記都必須為假", () => {
    const asSoup = { ...publishedRecipe(), category: "湯" };
    failsAt({ ...asSoup, vegetable: true, protein: false }, "vegetable");
    failsAt({ ...asSoup, vegetable: false, protein: true }, "protein");
    assert.equal(
      schema.safeParse({ ...asSoup, vegetable: false, protein: false }).success,
      true,
    );
  });

  it("分類可以是主食；主食不可標蔬菜菜或蛋白質菜，也不可為配菜候選", () => {
    const staple = {
      ...publishedRecipe(),
      category: "主食",
      vegetable: false,
      protein: false,
      mealCandidate: false,
    };
    assert.equal(schema.safeParse(staple).success, true);
    failsAt({ ...staple, vegetable: true }, "vegetable");
    failsAt({ ...staple, protein: true }, "protein");
    failsAt({ ...staple, mealCandidate: true }, "mealCandidate");
  });

  it("主食規則草稿同樣適用", () => {
    const draftStaple = {
      ...draftRecipe(),
      category: "主食",
      mealCandidate: true,
    };
    failsAt(draftStaple, "mealCandidate");
    failsAt(
      { ...draftStaple, mealCandidate: false, vegetable: true },
      "vegetable",
    );
    assert.equal(
      schema.safeParse({ ...draftStaple, mealCandidate: false }).success,
      true,
    );
  });

  it("標記規則草稿同樣適用", () => {
    failsAt({ ...draftRecipe(), vegetable: true }, "vegetable");
    failsAt({ ...draftRecipe(), category: "非湯料理" }, "vegetable");
    assert.equal(
      schema.safeParse({
        ...draftRecipe(),
        category: "非湯料理",
        protein: true,
      }).success,
      true,
    );
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

  it("烹調時間為必填，草稿也一樣", () => {
    const { timeMinutes: _published, ...published } = publishedRecipe();
    failsAt(published, "timeMinutes");
    const { timeMinutes: _draft, ...draft } = draftRecipe();
    failsAt(draft, "timeMinutes");
  });

  it("烹調時間須為正整數分鐘", () => {
    for (const timeMinutes of [0, -5, 12.5]) {
      failsAt({ ...publishedRecipe(), timeMinutes }, "timeMinutes");
    }
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
    const { hero: _h, ...noHero } = publishedRecipe();
    failsAt(noHero, "hero");
    const { ingredientsPhoto: _i, ...noPhoto } = publishedRecipe();
    failsAt(noPhoto, "ingredientsPhoto");
    const noStepImage = {
      ...publishedRecipe(),
      steps: [{ text: "番茄去蒂切成小塊。" }],
    };
    failsAt(noStepImage, "steps");
  });

  it("草稿可以沒有任何圖片", () => {
    assert.equal(schema.safeParse(draftRecipe()).success, true);
  });

  it("圖片物件沒有替代文字失敗（草稿也一樣）", () => {
    failsAt({ ...publishedRecipe(), hero: { src: "hero.webp" } }, "hero.alt");
    failsAt(
      { ...publishedRecipe(), ingredientsPhoto: { src: "a.webp", alt: " " } },
      "ingredientsPhoto.alt",
    );
    failsAt(
      {
        ...publishedRecipe(),
        steps: [{ text: "切。", image: { src: "s.webp" } }],
      },
      "steps.0.image.alt",
    );
    failsAt({ ...draftRecipe(), hero: { src: "hero.webp" } }, "hero.alt");
  });

  it("材料可有自己的圖片，同樣必須有替代文字", () => {
    const withImage = (image: unknown) => ({
      ...publishedRecipe(),
      ingredients: [{ name: "番茄", amount: { value: 2, unit: "顆" }, image }],
    });
    assert.equal(
      schema.safeParse(withImage({ src: "t.webp", alt: "紅色番茄" })).success,
      true,
    );
    failsAt(withImage({ src: "t.webp" }), "ingredients.0.image.alt");
  });
});
