import assert from "node:assert/strict";
import { test } from "node:test";
import { parseFavoriteIds } from "../src/utils/favorites.ts";

test("收藏資料只接受有效識別值，並保留首次出現的順序", () => {
  assert.deepEqual(
    parseFavoriteIds(
      JSON.stringify([
        "tomato-egg",
        "egg-drop-soup",
        "tomato-egg",
        3,
        "../bad",
      ]),
    ),
    ["tomato-egg", "egg-drop-soup"],
  );
});

test("缺少或損壞的收藏資料視為空清單", () => {
  assert.deepEqual(parseFavoriteIds(null), []);
  assert.deepEqual(parseFavoriteIds("broken"), []);
  assert.deepEqual(parseFavoriteIds('{"id":"tomato-egg"}'), []);
});
