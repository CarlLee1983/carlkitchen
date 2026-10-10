import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";

const quarantined = [
  "roast-chicken-legs",
  "salmon-rice",
  "seafood-fried-noodles",
  "unagi-rice",
];

// 2026-10-10 來源複核：尚未核准或全文未核實的配方不能進正式輸出。
// 取得核准並完成逐項查證後，連同來源紀錄更新這份回歸測試。
describe("第八批來源待核的發布防護", () => {
  for (const id of quarantined) {
    it(`${id} 保持草稿且不保留失效的核准來源紀錄`, () => {
      const recipe = readFileSync(
        new URL(`../content/recipes/${id}/recipe.yaml`, import.meta.url),
        "utf8",
      );
      assert.match(recipe, /^draft: true$/m);
      assert.equal(
        existsSync(new URL(`../content/sources/${id}.yaml`, import.meta.url)),
        false,
      );
    });
  }

  it("蒲燒鰻魚炊飯總時間包含泡米、瀝乾、煮飯與續燜", () => {
    const recipe = readFileSync(
      new URL("../content/recipes/unagi-rice/recipe.yaml", import.meta.url),
      "utf8",
    );
    assert.match(recipe, /^timeMinutes: 100$/m);
    assert.match(recipe, /推估/);
    assert.match(recipe, /35 分鐘/);
    assert.match(recipe, /機型/);
  });
});
