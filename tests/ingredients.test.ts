import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatAmount, groupIngredients } from "../src/utils/ingredients.ts";

describe("groupIngredients", () => {
  const ingredients = [
    { name: "番茄", amount: { value: 2, unit: "顆" } },
    { name: "糖", amount: { value: 5, unit: "g" }, group: "調味" },
    { name: "雞蛋", amount: { value: 3, unit: "顆" } },
    { name: "鹽", group: "調味" },
  ];

  it("沒有分組的歸為主料，並排在調味之前", () => {
    const groups = groupIngredients(ingredients);
    assert.deepEqual(
      groups.map((group) => group.label),
      ["主料", "調味"],
    );
    assert.deepEqual(
      groups[0]!.items.map((item) => item.name),
      ["番茄", "雞蛋"],
    );
    assert.deepEqual(
      groups[1]!.items.map((item) => item.name),
      ["糖", "鹽"],
    );
  });

  it("明寫「主料」與未分組的材料合成同一組", () => {
    const groups = groupIngredients([
      { name: "番茄" },
      { name: "雞蛋", group: "主料" },
      { name: "鹽", group: "調味" },
    ]);
    assert.deepEqual(
      groups.map((group) => group.label),
      ["主料", "調味"],
    );
    assert.deepEqual(
      groups[0]!.items.map((item) => item.name),
      ["番茄", "雞蛋"],
    );
  });

  it("只有調味時不產生空的主料組", () => {
    const groups = groupIngredients([{ name: "鹽", group: "調味" }]);
    assert.deepEqual(
      groups.map((group) => group.label),
      ["調味"],
    );
  });

  it("不改動輸入", () => {
    const copy = structuredClone(ingredients);
    groupIngredients(ingredients);
    assert.deepEqual(ingredients, copy);
  });
});

describe("formatAmount", () => {
  it("有用量時顯示數值與單位", () => {
    assert.equal(formatAmount({ value: 2, unit: "顆" }), "2 顆");
  });
  it("沒有用量時顯示「適量」", () => {
    assert.equal(formatAmount(undefined), "適量");
  });
});
