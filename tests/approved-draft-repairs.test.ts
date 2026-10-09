import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parse } from "yaml";
import { parseRecipe } from "../src/content-checks/recipes.ts";

const expected = [
  {
    id: "sesame-oil-birdsnest-fern",
    source: "https://shop.sgfa.org.tw/article_view.php?new_sn=7574",
    ingredient: "山蘇",
    grams: 500,
    servings: 6,
  },
  {
    id: "japanese-fried-tofu",
    source: "https://kikkomanusa.com/chinese/recipes/agedashi-tofu/",
    ingredient: "豆腐",
    grams: 397,
    servings: 3,
  },
  {
    id: "vinegar-fish-slices",
    source:
      "https://kikkoman.com.tw/recipe_detal_%E9%86%8B%E6%BA%9C%E9%AD%9A%E7%89%87_744",
    ingredient: "鯛魚",
    grams: 180,
    servings: 2,
  },
];

describe("核准來源的舊草稿修復", () => {
  for (const row of expected) {
    it(`${row.id} 保留核准配方的主料與份數`, () => {
      const raw = parse(
        readFileSync(
          new URL(`../content/recipes/${row.id}/recipe.yaml`, import.meta.url),
          "utf8",
        ),
      );
      const result = parseRecipe(row.id, raw);
      assert.deepEqual(result.issues, []);
      assert.ok(result.data);
      const data = result.data;
      assert.equal(data.draft, false);
      assert.ok(data.hero && data.ingredientsPhoto);
      assert.ok(data.steps.filter((step) => step.image).length >= 3);
      assert.equal(data.servings, row.servings);
      const ingredient = data.ingredients.find((item) =>
        item.name.includes(row.ingredient),
      );
      assert.ok(ingredient);
      assert.deepEqual(ingredient.amount, { value: row.grams, unit: "g" });
      const source = parse(
        readFileSync(
          new URL(`../content/sources/${row.id}.yaml`, import.meta.url),
          "utf8",
        ),
      );
      assert.deepEqual(source.urls, [row.source]);
    });
  }
});
