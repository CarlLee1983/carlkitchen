import { z } from "astro/zod";

export const RECIPE_CATEGORIES = ["非湯料理", "湯"] as const;

/** 沒有用量（「適量」）的材料只允許出現在這個分組。 */
export const SEASONING_GROUP = "調味";

const nonEmpty = z.string().trim().min(1);

const ingredientSchema = z
  .object({
    name: nonEmpty,
    amount: z
      .object({
        value: z.number().positive(),
        unit: nonEmpty,
      })
      .optional(),
    note: nonEmpty.optional(),
    group: nonEmpty.optional(),
  })
  .superRefine((ingredient, context) => {
    if (!ingredient.amount && ingredient.group !== SEASONING_GROUP) {
      context.addIssue({
        code: "custom",
        path: ["amount"],
        message: `只有「${SEASONING_GROUP}」組的材料可以省略用量（適量）。`,
      });
    }
  });

/**
 * `image` 由呼叫端注入：內容集合傳入 Astro 的 `image()`，單元測試傳入字串 schema，
 * 這樣不必啟動 Astro 也能驗證其餘規則。
 */
export function createRecipeSchema<Image extends z.ZodType>(image: Image) {
  const stepSchema = z.object({
    text: nonEmpty,
    image: image.optional(),
    imageAlt: nonEmpty.optional(),
  });

  return z
    .object({
      title: nonEmpty,
      summary: nonEmpty,
      servings: z.number().int().positive(),
      category: z.enum(RECIPE_CATEGORIES),
      draft: z.boolean(),
      ingredients: z.array(ingredientSchema).min(1),
      steps: z.array(stepSchema).min(1),
      heroImage: image.optional(),
      heroAlt: nonEmpty.optional(),
      ingredientsImage: image.optional(),
      ingredientsAlt: nonEmpty.optional(),
      mealCandidate: z.boolean().default(false),
      vegetable: z.boolean().default(false),
      protein: z.boolean().default(false),
      timeMinutes: z.number().int().positive().optional(),
      difficulty: nonEmpty.optional(),
      cuisine: nonEmpty.optional(),
      tags: z.array(nonEmpty).default([]),
      aliases: z.array(nonEmpty).default([]),
      tip: nonEmpty.optional(),
    })
    .superRefine((recipe, context) => {
      const require = (
        present: unknown,
        path: (string | number)[],
        message: string,
      ) => {
        if (!present) context.addIssue({ code: "custom", path, message });
      };

      // 圖片與替代文字成對出現（草稿也一樣）
      if (recipe.heroImage)
        require(recipe.heroAlt, ["heroAlt"], "成品圖必須有替代文字。");
      if (recipe.ingredientsImage) {
        require(recipe.ingredientsAlt, [
          "ingredientsAlt",
        ], "材料合照必須有替代文字。");
      }
      recipe.steps.forEach((step, index) => {
        if (step.image) {
          require(step.imageAlt, [
            "steps",
            index,
            "imageAlt",
          ], "步驟圖必須有替代文字。");
        }
      });

      // 已發布的菜譜必須圖片齊全；草稿可以缺
      if (!recipe.draft) {
        require(recipe.heroImage, ["heroImage"], "已發布菜譜必須有成品圖。");
        require(recipe.ingredientsImage, [
          "ingredientsImage",
        ], "已發布菜譜必須有材料合照。");
        require(recipe.steps.some((step) => step.image), [
          "steps",
        ], "已發布菜譜至少要有一張步驟圖。");
      }
    });
}
