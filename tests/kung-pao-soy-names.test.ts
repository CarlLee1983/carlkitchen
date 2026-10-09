import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { it } from "node:test";
import { parse } from "yaml";

it("宮保雞丁以用途說明兩種醬油，保留原種類與用量", () => {
  const text = readFileSync(
    new URL("../content/recipes/kung-pao-chicken/recipe.yaml", import.meta.url),
    "utf8",
  );
  const data = parse(text);
  const dark = data.ingredients.find(
    (item: { name: string }) => item.name === "上色用深色醬油",
  );
  const light = data.ingredients.find(
    (item: { name: string }) => item.name === "調味用醬油",
  );
  assert.ok(dark && light);
  assert.deepEqual(dark.amount, { value: 7.5, unit: "ml" });
  assert.deepEqual(light.amount, { value: 15, unit: "ml" });
  assert.match(dark.note, /dark soy sauce/);
  assert.match(light.note, /light soy sauce/);
  assert.doesNotMatch(text, /老抽|生抽|淡色醬油/);
  assert.match(data.steps[2].text, /上色用深色醬油.*調味用醬油/);
  assert.match(data.ingredientsPhoto.alt, /上色用深色醬油.*調味用醬油/);
});
