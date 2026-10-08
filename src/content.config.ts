import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { createRecipeSchema } from "./content/recipe-schema";
import { createIngredientSchema } from "./content/ingredient-schema";
import { createTopicSchema } from "./content/topic-schema";
import { createSolarTermSchema } from "./content/solar-term-schema";
import { contentLoaderBase } from "./content/content-dir";

// 內容根目錄由 RECIPES_DIR 決定：預設是正式內容，測試與 e2e 指向固定資料菜譜（相對或絕對路徑皆可）。
const recipes = defineCollection({
  // 一道菜一個資料夾；識別值（即網址 slug）就是資料夾名稱。
  loader: glob({
    base: contentLoaderBase(process.env.RECIPES_DIR ?? "", "content/recipes"),
    pattern: "*/recipe.yaml",
    generateId: ({ entry }) => entry.split("/")[0]!,
  }),
  schema: ({ image }) => createRecipeSchema(image()),
});

const ingredients = defineCollection({
  loader: glob({
    base: contentLoaderBase(
      process.env.INGREDIENTS_DIR ?? "",
      "content/ingredients",
    ),
    pattern: "*/ingredient.yaml",
    generateId: ({ entry }) => entry.split("/")[0]!,
  }),
  schema: ({ image }) => createIngredientSchema(image()),
});

const topics = defineCollection({
  // 一篇專題一個資料夾；識別值（即網址 slug）就是資料夾名稱。
  loader: glob({
    base: contentLoaderBase(process.env.TOPICS_DIR ?? "", "content/topics"),
    pattern: "*/topic.md",
    generateId: ({ entry }) => entry.split("/")[0]!,
  }),
  schema: ({ image }) => createTopicSchema(image()),
});

const solarTerms = defineCollection({
  // 一個節氣一個 YAML 檔；識別值就是檔名，固定 24 個（同 src/assets/solar-terms/ 的插畫檔名）。
  loader: glob({
    base: contentLoaderBase(
      process.env.SOLAR_TERMS_DIR ?? "",
      "content/solar-terms",
    ),
    pattern: "*.yaml",
  }),
  schema: createSolarTermSchema(),
});

export const collections = { recipes, ingredients, topics, solarTerms };
