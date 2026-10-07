import { z } from "astro/zod";

export const RECIPE_CATEGORIES = ["非湯料理", "主食", "湯"] as const;

export type RecipeCategory = (typeof RECIPE_CATEGORIES)[number];

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
      timeMinutes: z.number().int().positive(),
      difficulty: nonEmpty.optional(),
      cuisine: nonEmpty.optional(),
      tags: z.array(nonEmpty).default([]),
      aliases: z.array(nonEmpty).default([]),
      tip: nonEmpty.optional(),
    })
    .superRefine((recipe, context) => {
      // 性質標記只屬於非湯料理，且非湯料理至少要有一個；主食不參與配一桌；草稿同樣適用
      switch (recipe.category) {
        case "湯":
          for (const field of ["vegetable", "protein"] as const) {
            if (recipe[field]) {
              context.addIssue({
                code: "custom",
                path: [field],
                message: "湯不可標記蔬菜菜或蛋白質菜。",
              });
            }
          }
          break;
        case "非湯料理":
          if (!recipe.vegetable && !recipe.protein) {
            for (const field of ["vegetable", "protein"] as const) {
              context.addIssue({
                code: "custom",
                path: [field],
                message: "非湯料理的蔬菜菜與蛋白質菜至少要有一個為真。",
              });
            }
          }
          break;
        case "主食":
          for (const field of [
            "vegetable",
            "protein",
            "mealCandidate",
          ] as const) {
            if (recipe[field]) {
              context.addIssue({
                code: "custom",
                path: [field],
                message:
                  field === "mealCandidate"
                    ? "主食不可為配菜候選。"
                    : "主食不可標記蔬菜菜或蛋白質菜。",
              });
            }
          }
          break;
        default:
          // 分類列舉新增值時，這裡會在型別檢查時報錯，提醒補上規則
          recipe.category satisfies never;
      }
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
