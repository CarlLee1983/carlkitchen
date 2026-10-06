import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterDrafts } from "../src/utils/drafts.ts";
import { sortByTitle } from "../src/utils/recipe-list.ts";

const entries = [
  { id: "a", data: { draft: false } },
  { id: "b", data: { draft: true } },
];

describe("filterDrafts", () => {
  it("正式建置排除草稿", () => {
    assert.deepEqual(
      filterDrafts(entries, false).map((entry) => entry.id),
      ["a"],
    );
  });

  it("開發模式保留草稿，但回傳新陣列、不改動輸入", () => {
    const result = filterDrafts(entries, true);
    assert.notStrictEqual(result, entries);
    assert.deepEqual(
      result.map((entry) => entry.id),
      ["a", "b"],
    );
    result.reverse();
    assert.deepEqual(
      entries.map((entry) => entry.id),
      ["a", "b"],
    );
  });
});

describe("sortByTitle", () => {
  const recipes = [
    { id: "3", data: { title: "麻婆豆腐" } },
    { id: "1", data: { title: "番茄炒蛋" } },
    { id: "2", data: { title: "紅燒肉" } },
    { id: "4", data: { title: "蒜香青菜" } },
  ];

  it("依 zh-Hant 排序，並且不改動輸入順序", () => {
    const sorted = sortByTitle(recipes);
    assert.deepEqual(
      sorted.map((recipe) => recipe.data.title),
      [...recipes.map((recipe) => recipe.data.title)].sort((a, b) =>
        a.localeCompare(b, "zh-Hant"),
      ),
    );
    assert.notStrictEqual(sorted, recipes);
    assert.deepEqual(
      recipes.map((recipe) => recipe.id),
      ["3", "1", "2", "4"],
    );
  });
});
