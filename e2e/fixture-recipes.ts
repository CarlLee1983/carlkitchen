import { readdirSync, readFileSync } from "node:fs";
import { z } from "astro/zod";
import { parse } from "yaml";
import {
  createRecipeSchema,
  type DishKind,
} from "../src/content/recipe-schema";

const ROOT = "tests/fixtures/recipes";

export interface FixtureRecipe {
  id: string;
  title: string;
  summary: string;
  heroAlt: string;
  category: "非湯料理" | "主食" | "湯";
  dishKinds: DishKind[];
  classificationReason: string;
  vegetable: boolean;
  protein: boolean;
  /** 材料名稱，依 YAML 順序；第一項即「第一項材料」。 */
  ingredientNames: string[];
  aliases: string[];
  tags: string[];
  /** 不應被搜尋的文字來源：步驟文字、用量單位、材料備註、小提醒、各圖替代文字。 */
  unsearchableTexts: string[];
}

// 以專案的 schema 驗證並解析固定菜譜；圖片欄位在這裡只是路徑字串。
const recipeSchema = createRecipeSchema(z.string());
type RawRecipe = z.infer<typeof recipeSchema>;

function toFixture(id: string, raw: RawRecipe): FixtureRecipe {
  return {
    id,
    title: raw.title,
    summary: raw.summary,
    heroAlt: raw.hero?.alt ?? "",
    category: raw.category,
    dishKinds: raw.dishKinds,
    classificationReason: raw.classificationReason,
    vegetable: raw.vegetable,
    protein: raw.protein,
    ingredientNames: raw.ingredients.map((ingredient) => ingredient.name),
    aliases: raw.aliases ?? [],
    tags: raw.tags ?? [],
    unsearchableTexts: [
      ...raw.steps.flatMap((step) => [step.text, step.image?.alt]),
      ...raw.ingredients.flatMap((ingredient) => [
        ingredient.amount?.unit,
        ingredient.note,
        ingredient.image?.alt,
      ]),
      raw.tip,
      raw.classificationReason,
      raw.hero?.alt,
      raw.ingredientsPhoto?.alt,
    ].filter((text): text is string => Boolean(text)),
  };
}

function loadFixtures(): { recipe: FixtureRecipe; draft: boolean }[] {
  return readdirSync(ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const raw = recipeSchema.parse(
        parse(readFileSync(`${ROOT}/${entry.name}/recipe.yaml`, "utf8")),
      );
      return { recipe: toFixture(entry.name, raw), draft: raw.draft };
    });
}

const byTitle = (a: FixtureRecipe, b: FixtureRecipe) =>
  a.title.localeCompare(b.title, "zh-Hant");

/** 已發布的固定菜譜（排除草稿），依菜名（繁中）排序，與首頁清單規則一致。 */
export function publishedFixtureRecipes(): FixtureRecipe[] {
  return loadFixtures()
    .filter(({ draft }) => !draft)
    .map(({ recipe }) => recipe)
    .sort(byTitle);
}

/** 草稿固定菜譜，用來驗證它們不出現在搜尋結果。 */
export function draftFixtureRecipes(): FixtureRecipe[] {
  return loadFixtures()
    .filter(({ draft }) => draft)
    .map(({ recipe }) => recipe)
    .sort(byTitle);
}

/** 由fixture欄位獨立推導預期顯示文字，不共用待測的正式分類函式。 */
export function fixtureKindLabels(recipe: FixtureRecipe): string[] {
  switch (recipe.category) {
    case "主食":
      return ["主食"];
    case "湯":
      return ["湯"];
    case "非湯料理":
      return recipe.dishKinds.map(
        (kind) =>
          ({
            vegetable: "蔬菜",
            meat: "肉類",
            seafood: "海鮮",
            "egg-bean": "蛋豆",
          })[kind],
      );
    default:
      return recipe.category satisfies never;
  }
}
