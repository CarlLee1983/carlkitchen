import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { describe, it } from "node:test";
import { parse } from "yaml";
import { relatedRecipeIds } from "../src/utils/related-recipes.ts";

const recipesDir = new URL("../content/recipes/", import.meta.url);
const all = readdirSync(recipesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map(({ name: id }) => ({
    id,
    ...parse(readFileSync(new URL(`${id}/recipe.yaml`, recipesDir), "utf8")),
  }));
const published = all.filter((recipe) => !recipe.draft);
const draftIds = new Set(all.filter((r) => r.draft).map((r) => r.id));
const related = relatedRecipeIds(published);

describe("真實菜譜的相關菜譜", () => {
  it("宮保蝦仁的相關菜譜有共用蝦仁的菜", () => {
    const top = related.get("kung-pao-shrimp")!;
    for (const id of [
      "tofu-shrimp",
      "shrimp-scrambled-eggs",
      "xo-sauce-seafood-stir-fry",
    ]) {
      assert.ok(top.includes(id), `${id} 應在宮保蝦仁的相關菜譜`);
    }
  });

  it("橙汁魚片的相關菜譜有共用鯛魚片的菜", () => {
    const top = related.get("orange-fish-slices")!;
    for (const id of ["almond-crusted-fish", "garlic-fried-fish"]) {
      assert.ok(top.includes(id), `${id} 應在橙汁魚片的相關菜譜`);
    }
  });

  it("酒蒸肉丸的相關菜譜有共用豬絞肉的菜", () => {
    const top = related.get("rice-wine-pork-meatballs")!;
    for (const id of [
      "steamed-pork-pickled-cucumber",
      "onion-minced-pork",
      "fly-head-stir-fry",
    ]) {
      assert.ok(top.includes(id), `${id} 應在酒蒸肉丸的相關菜譜`);
    }
  });

  it("任何一道的相關菜譜都不含草稿或自己，且最多 4 道", () => {
    assert.ok(draftIds.size > 0, "正式內容應含草稿，這條斷言才有意義");
    assert.equal(related.size, published.length);
    for (const [id, ids] of related) {
      assert.ok(ids.length <= 4, id);
      assert.ok(!ids.includes(id), `${id} 不可列出自己`);
      for (const other of ids) {
        assert.ok(!draftIds.has(other), `${id} 不可列出草稿 ${other}`);
      }
    }
  });
});
