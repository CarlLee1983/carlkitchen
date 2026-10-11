import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parse } from "yaml";

function ingredient(id: string, name: string, withoutAmount = false) {
  const data = parse(
    readFileSync(
      new URL(`../content/recipes/${id}/recipe.yaml`, import.meta.url),
      "utf8",
    ),
  );
  const item = data.ingredients.find(
    (value: { name: string; amount?: unknown }) =>
      value.name === name && (!withoutAmount || !value.amount),
  );
  assert.ok(item);
  return item;
}

describe("材料用量的自然用詞", () => {
  it("彈性油量寫適量，保留用途與原有少許", () => {
    assert.equal(ingredient("japanese-chicken-curry", "食用油").note, "炒料用");
    assert.equal(ingredient("chive-omelet", "食用油").note, undefined);
    assert.equal(
      ingredient("japanese-yaki-udon", "食用油").note,
      "少許，炒料用",
    );
  });
  it("主料保留量詞，不把未換算的重量改成適量", () => {
    const chicken = ingredient("japanese-chicken-curry", "雞胸肉");
    assert.deepEqual(chicken.amount, { value: 1, unit: "塊" });
    assert.equal(chicken.note, "切丁");
    assert.deepEqual(ingredient("ants-climbing-tree", "粉絲").amount, {
      value: 3,
      unit: "份",
    });
    assert.deepEqual(ingredient("hot-and-sour-soup", "熟竹筍").amount, {
      value: 0.5,
      unit: "個",
    });
  });
  it("完全缺少的主料用量與未知比例仍明示待確認", () => {
    assert.equal(
      ingredient("seaweed-shimeji-salad", "海帶芽").note,
      "用量待確認",
    );
    assert.equal(
      ingredient("vinegar-fish-slices", "太白粉水").note,
      "粉水比例待確認",
    );
    assert.equal(
      ingredient("ants-climbing-tree", "醬油").note,
      "匙的容量待確認",
    );
  });
  it("來源紀錄保留原有缺量事實", () => {
    const source = readFileSync(
      new URL("../content/sources/chive-omelet.yaml", import.meta.url),
      "utf8",
    );
    assert.match(source, /食用油.*用量未提供/);
  });
});

const quantityCases = JSON.parse(
  readFileSync(
    new URL("./fixtures/quantity-wording/cases.json", import.meta.url),
    "utf8",
  ),
) as { id: string; name: string; note: string | null }[];

describe("本批無定量材料只由用量欄顯示一次適量", () => {
  for (const entry of quantityCases) {
    it(`${entry.id}：${entry.name} 保留用途而不重複適量`, () => {
      const item = ingredient(entry.id, entry.name, true);
      assert.equal(item.amount, undefined);
      assert.equal(item.note, entry.note ?? undefined);
    });
  }
});
