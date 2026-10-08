import { z } from "astro/zod";
import { CONTENT_ID_PATTERN } from "./content-id.ts";

export const INGREDIENT_CATEGORIES = [
  "vegetable",
  "aromatic",
  "seasoning",
] as const;

const nonEmpty = z.string().trim().min(1);
const recipeId = nonEmpty.regex(CONTENT_ID_PATTERN);

/** 食材條目與菜譜分開建模；蔬菜須標明臺灣產期的適用範圍。 */
export function createIngredientSchema<Image extends z.ZodType>(image: Image) {
  return z
    .object({
      title: nonEmpty,
      summary: nonEmpty,
      category: z.enum(INGREDIENT_CATEGORIES),
      draft: z.boolean(),
      selection: nonEmpty,
      preparation: nonEmpty,
      storage: nonEmpty,
      uses: nonEmpty,
      notices: z
        .object({
          alcohol: nonEmpty.optional(),
          allergens: z.array(nonEmpty).min(1).optional(),
        })
        .refine((value) => value.alcohol || value.allergens, {
          message: "食用提醒至少需要酒精或過敏原內容。",
        })
        .optional(),
      season: z
        .object({
          production: z
            .array(z.object({ area: nonEmpty, months: nonEmpty }))
            .min(1),
          bestFlavor: nonEmpty.optional(),
          scope: nonEmpty,
        })
        .optional(),
      relatedRecipes: z.array(recipeId),
      hero: z.object({ src: image, alt: nonEmpty }).optional(),
    })
    .superRefine((entry, context) => {
      if (entry.category === "vegetable" && !entry.season) {
        context.addIssue({
          code: "custom",
          path: ["season"],
          message: "蔬菜條目必須填寫臺灣產期與適用範圍。",
        });
      }
      if (!entry.draft && entry.relatedRecipes.length === 0) {
        context.addIssue({
          code: "custom",
          path: ["relatedRecipes"],
          message: "已發布條目至少需要一篇相關菜譜。",
        });
      }
    });
}
