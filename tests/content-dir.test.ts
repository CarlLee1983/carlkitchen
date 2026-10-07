import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { contentLoaderBase } from "../src/content/content-dir.ts";

describe("contentLoaderBase", () => {
  it("相對路徑維持相對於專案根目錄", () => {
    assert.equal(
      contentLoaderBase("tests/fixtures/recipes", "content/recipes"),
      "./tests/fixtures/recipes",
    );
  });

  it("絕對路徑轉成檔案 URL，不被拼成 ./ 開頭的相對路徑", () => {
    const base = contentLoaderBase("/tmp/some/recipes", "content/recipes");
    assert.ok(base instanceof URL);
    assert.equal(fileURLToPath(base), "/tmp/some/recipes");
  });

  it("空字串使用預設的正式內容目錄", () => {
    assert.equal(contentLoaderBase("", "content/recipes"), "./content/recipes");
  });
});
