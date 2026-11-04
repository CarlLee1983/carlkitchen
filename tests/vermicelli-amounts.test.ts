import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parse } from "yaml";
import { parseRecipe } from "../src/content-checks/recipes.ts";

// 對照儲存庫保留的原始擷取紀錄，不把顆數、體積或「少許」當成克數。
test("芋頭米粉湯保留來源的材料數量與單位", () => {
  const id = "taro-rice-vermicelli-soup";
  const raw = parse(
    readFileSync(
      new URL(`../content/recipes/${id}/recipe.yaml`, import.meta.url),
      "utf8",
    ),
  );
  const result = parseRecipe(id, raw);
  assert.deepEqual(result.issues, []);
  assert.ok(result.data);
  const ingredients = result.data.ingredients;
  for (const [name, value, unit] of [
    ["埔里米粉", 300, "g"],
    ["芋頭", 200, "g"],
    ["香菇", 3, "朵"],
    ["紅蔥頭", 5, "顆"],
    ["瘦肉", 100, "g"],
    ["高湯", 1500, "ml"],
    ["芹菜末", 10, "g"],
    ["鹽", 0.5, "大匙"],
    ["胡椒粉", 1, "小匙"],
  ] as const) {
    assert.deepEqual(ingredients.find((item) => item.name === name)?.amount, {
      value,
      unit,
    });
  }
  for (const name of ["油蔥酥", "香菜"]) {
    const ingredient = ingredients.find((item) => item.name === name);
    assert.ok(ingredient);
    assert.equal(ingredient.amount, undefined);
    assert.equal(ingredient.group, "調味");
    assert.equal(ingredient.note, "少許");
  }
});

// 2026-11-04 核對楊桃核准網址轉址後的 UTF-8 頁面 JSON-LD。
test("金瓜炒米粉不再把所有材料設成 100 g", () => {
  const id = "pumpkin-fried-rice-vermicelli";
  const raw = parse(
    readFileSync(
      new URL(`../content/recipes/${id}/recipe.yaml`, import.meta.url),
      "utf8",
    ),
  );
  const result = parseRecipe(id, raw);
  assert.deepEqual(result.issues, []);
  assert.ok(result.data);
  for (const [name, value, unit] of [
    ["南瓜", 150, "g"],
    ["韭黃", 50, "g"],
    ["紅蘿蔔", 20, "g"],
    ["米粉", 150, "g"],
    ["鹽", 0.5, "小匙"],
    ["醬油", 1, "大匙"],
    ["烏醋", 1, "大匙"],
    ["水", 100, "ml"],
  ] as const) {
    assert.deepEqual(
      result.data.ingredients.find((item) => item.name === name)?.amount,
      { value, unit },
    );
  }
  const pepper = result.data.ingredients.find(
    (item) => item.name === "白胡椒粉",
  );
  assert.ok(pepper);
  assert.equal(pepper.amount, undefined);
  assert.equal(pepper.group, "調味");
  assert.equal(pepper.note, "少許");
});
