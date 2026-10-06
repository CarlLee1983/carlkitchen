import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { createRecipeSchema } from "./content/recipe-schema";
import { recipesLoaderBase } from "./content/recipes-dir";

// 內容根目錄由 RECIPES_DIR 決定：預設是正式內容，測試與 e2e 指向固定資料菜譜（相對或絕對路徑皆可）。
const recipesBase = recipesLoaderBase(process.env.RECIPES_DIR ?? "");

const recipes = defineCollection({
  // 一道菜一個資料夾；識別值（即網址 slug）就是資料夾名稱。
  loader: glob({
    base: recipesBase,
    pattern: "*/recipe.yaml",
    generateId: ({ entry }) => entry.split("/")[0]!,
  }),
  schema: ({ image }) => createRecipeSchema(image()),
});

export const collections = { recipes };
