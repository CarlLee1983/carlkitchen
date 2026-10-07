import { z } from "astro/zod";

export const INGREDIENT_CATEGORIES = [
  "vegetable",
  "aromatic",
  "seasoning",
] as const;

const nonEmpty = z.string().trim().min(1);
const recipeId = nonEmpty.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

/** 食材條目與菜譜分開建模；蔬菜需要有臺灣產期及賞味期的適用範圍。 */
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
      season: z
        .object({
          production: z
            .array(z.object({ area: nonEmpty, months: nonEmpty }))
            .min(1),
          bestFlavor: nonEmpty,
          scope: nonEmpty,
        })
        .optional(),
      relatedRecipes: z.array(recipeId).min(1),
      hero: z.object({ src: image, alt: nonEmpty }).optional(),
    })
    .superRefine((entry, context) => {
      if (entry.category === "vegetable" && !entry.season) {
        context.addIssue({
          code: "custom",
          path: ["season"],
          message: "蔬菜條目必須填寫臺灣產期、最佳賞味期與適用範圍。",
        });
      }
    });
}
