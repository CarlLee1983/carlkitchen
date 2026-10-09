import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parse } from "yaml";
import { parseRecipe } from "../src/content-checks/recipes.ts";

// 站主 2026-10-09 對兩道圖已齊草稿的裁定，見 .scratch/publish-drafts/2026-10-09-owner-fixes.md
function loadRecipe(id: string) {
  const raw = parse(
    readFileSync(
      new URL(`../content/recipes/${id}/recipe.yaml`, import.meta.url),
      "utf8",
    ),
  );
  const result = parseRecipe(id, raw);
  assert.deepEqual(result.issues, []);
  assert.ok(result.data);
  return result.data;
}

describe("站主裁定的草稿修正", () => {
  it("味噌蒸雞刪掉步驟沒用到的太白粉並發布", () => {
    const data = loadRecipe("miso-steamed-chicken");
    assert.equal(data.draft, false);
    assert.equal(
      data.ingredients.some((item) => item.name === "太白粉"),
      false,
    );
  });

  it("素石鍋拌飯最後一步放上菠菜並發布", () => {
    const data = loadRecipe("vegetarian-stone-pot-bibimbap");
    assert.equal(data.draft, false);
    const last = data.steps.at(-1);
    assert.ok(last);
    assert.match(last.text, /放上[^。]*菠菜/);
  });
});
