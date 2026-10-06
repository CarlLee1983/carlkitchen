import { z } from "astro/zod";

export const RECIPE_CATEGORIES = ["非湯料理", "湯"] as const;

/** 沒有用量（「適量」）的材料只允許出現在這個分組。 */
export const SEASONING_GROUP = "調味";

/** 沒有分組的材料歸入的預設分組名稱。 */
export const DEFAULT_INGREDIENT_GROUP = "主料";

/** 沒有用量的材料在頁面上顯示的字樣。 */
export const UNSPECIFIED_AMOUNT_LABEL = "適量";

const nonEmpty = z.string().trim().min(1);

/**
 * `image` 由呼叫端注入：內容集合傳入 Astro 的 `image()`，單元測試傳入字串 schema，
 * 這樣不必啟動 Astro 也能驗證其餘規則。圖片一律是 `{ src, alt }`，
 * alt 必填，所以「每張圖都有替代文字」由型別保證。
 */
export function createRecipeSchema<Image extends z.ZodType>(image: Image) {
  const imageSchema = z.object({ src: image, alt: nonEmpty });

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
      image: imageSchema.optional(),
    })
    .superRefine((ingredient, context) => {
      if (!ingredient.amount && ingredient.group !== SEASONING_GROUP) {
        context.addIssue({
          code: "custom",
          path: ["amount"],
          message: `只有「${SEASONING_GROUP}」組的材料可以省略用量（${UNSPECIFIED_AMOUNT_LABEL}）。`,
        });
      }
    });

  const stepSchema = z.object({
    text: nonEmpty,
    image: imageSchema.optional(),
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
      hero: imageSchema.optional(),
      ingredientsPhoto: imageSchema.optional(),
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
      // 已發布的菜譜必須圖片齊全；草稿可以缺
      if (recipe.draft) return;
      const requireField = (
        present: unknown,
        path: (string | number)[],
        message: string,
      ) => {
        if (!present) context.addIssue({ code: "custom", path, message });
      };
      requireField(recipe.hero, ["hero"], "已發布菜譜必須有成品圖。");
      requireField(
        recipe.ingredientsPhoto,
        ["ingredientsPhoto"],
        "已發布菜譜必須有材料合照。",
      );
      requireField(
        recipe.steps.some((step) => step.image),
        ["steps"],
        "已發布菜譜至少要有一張步驟圖。",
      );
    });
}
