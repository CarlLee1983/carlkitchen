import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { relatedRecipeIds } from "../src/utils/related-recipes.ts";

type Input = Parameters<typeof relatedRecipeIds>[0][number];

const recipe = (
  id: string,
  options: Partial<Omit<Input, "id" | "ingredients">> & {
    ingredients?: (string | { name: string; group?: string })[];
  } = {},
): Input => ({
  id,
  category: options.category ?? "非湯料理",
  dishKinds: options.dishKinds ?? ["meat"],
  ingredients: (options.ingredients ?? []).map((item) =>
    typeof item === "string" ? { name: item } : item,
  ),
});

describe("relatedRecipeIds", () => {
  it("同料理主角的菜排在不同主角的菜之前", () => {
    const result = relatedRecipeIds([
      recipe("a", { dishKinds: ["meat"], ingredients: ["豬肉"] }),
      recipe("b", { dishKinds: ["vegetable"], ingredients: ["豬肉"] }),
      recipe("c", { dishKinds: ["meat", "seafood"] }),
    ]);

    assert.deepEqual(result.get("a"), ["c", "b"]);
  });

  it("不同組又沒有共用主要材料的菜不會補位，候選不足 4 道時有幾道列幾道", () => {
    const result = relatedRecipeIds([
      recipe("a", { dishKinds: ["meat"], ingredients: ["豬肉"] }),
      recipe("b", { dishKinds: ["meat"], ingredients: ["牛肉"] }),
      recipe("c", { dishKinds: ["vegetable"], ingredients: ["青江菜"] }),
    ]);

    assert.deepEqual(result.get("a"), ["b"]);
    assert.deepEqual(result.get("c"), []);
  });

  it("稀有材料的權重高於常見材料", () => {
    // 洋蔥 5 道中有 4 道用，豬肉只有 2 道用，所以共用豬肉的 c 排最前
    const result = relatedRecipeIds([
      recipe("a", { ingredients: ["豬肉", "洋蔥"] }),
      recipe("b", { ingredients: ["洋蔥"] }),
      recipe("c", { ingredients: ["豬肉"] }),
      recipe("d", { ingredients: ["洋蔥"] }),
      recipe("e", { ingredients: ["洋蔥"] }),
    ]);

    assert.equal(result.get("a")?.[0], "c");
  });

  it("調味、醃料兩組與排除清單中的材料不計分", () => {
    // 三道蔬菜都與 a 不同組，只有共用豬肉（主料）的 d 能入選
    const result = relatedRecipeIds([
      recipe("a", {
        ingredients: [
          "豬肉",
          "青蔥",
          "水",
          { name: "醬油", group: "調味" },
          { name: "太白粉", group: " 醃料 " },
        ],
      }),
      recipe("b", {
        dishKinds: ["vegetable"],
        ingredients: [{ name: "醬油", group: "調味" }, "青蔥", "水"],
      }),
      recipe("c", {
        dishKinds: ["vegetable"],
        ingredients: [{ name: "太白粉", group: "醃料" }],
      }),
      recipe("d", { dishKinds: ["vegetable"], ingredients: ["豬肉"] }),
    ]);

    assert.deepEqual(result.get("a"), ["d"]);
  });

  it("材料名稱只去頭尾空白後完全比對，不做同義詞", () => {
    const result = relatedRecipeIds([
      recipe("a", { ingredients: ["豬肉"] }),
      recipe("b", { dishKinds: ["vegetable"], ingredients: [" 豬肉 "] }),
      recipe("c", { dishKinds: ["vegetable"], ingredients: ["豬絞肉"] }),
      recipe("d", { dishKinds: ["vegetable"], ingredients: ["豬肉末"] }),
    ]);

    assert.deepEqual(result.get("a"), ["b"]);
  });

  it("主食只與主食同組，湯只與湯同組", () => {
    const result = relatedRecipeIds([
      recipe("rice-1", { category: "主食", dishKinds: [] }),
      recipe("rice-2", { category: "主食", dishKinds: [] }),
      recipe("soup-1", { category: "湯", dishKinds: [] }),
      recipe("soup-2", { category: "湯", dishKinds: [] }),
      recipe("dish", { dishKinds: [] }),
    ]);

    assert.deepEqual(result.get("rice-1"), ["rice-2"]);
    assert.deepEqual(result.get("soup-1"), ["soup-2"]);
    assert.deepEqual(result.get("dish"), []);
  });

  it("最多 4 道，不含自己，同分時依雜湊而非識別值順序", () => {
    const ids = ["a", "b", "c", "d", "e", "f"];
    const result = relatedRecipeIds(ids.map((id) => recipe(id)));

    // 識別值排序會是 b c d e；雜湊順序為 d e f b
    assert.deepEqual(result.get("a"), ["d", "e", "f", "b"]);
    assert.deepEqual(result.get("b"), ["e", "d", "f", "a"]);
    for (const [id, related] of result) assert.ok(!related.includes(id));
  });

  it("輸出與輸入順序無關", () => {
    const recipes = [
      recipe("a", { ingredients: ["豬肉"] }),
      recipe("b", { ingredients: ["豬肉"] }),
      recipe("c", { ingredients: ["牛肉"] }),
      recipe("d", { dishKinds: ["vegetable"], ingredients: ["豬肉"] }),
      recipe("e", { ingredients: ["牛肉"] }),
      recipe("f", { ingredients: ["雞肉"] }),
    ];
    const forward = relatedRecipeIds(recipes);
    const backward = relatedRecipeIds([...recipes].reverse());

    for (const { id } of recipes) {
      assert.deepEqual(backward.get(id), forward.get(id), id);
    }
  });
});
