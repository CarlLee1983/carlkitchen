import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { recipesLoaderBase } from "../src/content/recipes-dir.ts";

describe("recipesLoaderBase", () => {
  it("相對路徑維持相對於專案根目錄", () => {
    assert.equal(
      recipesLoaderBase("tests/fixtures/recipes"),
      "./tests/fixtures/recipes",
    );
  });

  it("絕對路徑轉成檔案 URL，不被拼成 ./ 開頭的相對路徑", () => {
    const base = recipesLoaderBase("/tmp/some/recipes");
    assert.ok(base instanceof URL);
    assert.equal(fileURLToPath(base), "/tmp/some/recipes");
  });

  it("空字串使用預設的正式內容目錄", () => {
    assert.equal(recipesLoaderBase(""), "./content/recipes");
  });
});
