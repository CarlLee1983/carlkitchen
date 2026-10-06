import { readdirSync, readFileSync } from "node:fs";
import { parse } from "yaml";

const ROOT = "tests/fixtures/recipes";

export interface FixtureRecipe {
  id: string;
  title: string;
  summary: string;
  heroAlt: string;
  category: "非湯料理" | "湯";
  /** 材料名稱，依 YAML 順序；第一項即「第一項材料」。 */
  ingredientNames: string[];
  aliases: string[];
  tags: string[];
  /** 不應被搜尋的文字來源：步驟文字、用量單位、材料備註、小提醒、各圖替代文字。 */
  unsearchableTexts: string[];
}

interface RawRecipe {
  title: string;
  summary: string;
  category: FixtureRecipe["category"];
  draft: boolean;
  tip?: string;
  tags?: string[];
  aliases?: string[];
  hero?: { alt: string };
  ingredientsPhoto?: { alt: string };
  ingredients: {
    name: string;
    amount?: { unit: string };
    note?: string;
    image?: { alt: string };
  }[];
  steps: { text: string; image?: { alt: string } }[];
}

function toFixture(id: string, raw: RawRecipe): FixtureRecipe {
  return {
    id,
    title: raw.title,
    summary: raw.summary,
    heroAlt: raw.hero?.alt ?? "",
    category: raw.category,
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
      raw.hero?.alt,
      raw.ingredientsPhoto?.alt,
    ].filter((text): text is string => Boolean(text)),
  };
}

function loadFixtures(): { recipe: FixtureRecipe; draft: boolean }[] {
  return readdirSync(ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const raw = parse(
        readFileSync(`${ROOT}/${entry.name}/recipe.yaml`, "utf8"),
      ) as RawRecipe;
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
