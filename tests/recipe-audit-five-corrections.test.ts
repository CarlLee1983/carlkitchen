import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { parse } from "yaml";

async function recipe(id: string) {
  return parse(
    await readFile(
      new URL(`../content/recipes/${id}/recipe.yaml`, import.meta.url),
      "utf8",
    ),
  );
}

test("海鮮粥保留香油 5 ml，不再標成半茶匙", async () => {
  const data = await recipe("taiwanese-seafood-congee");
  const oil = data.ingredients.find(
    (item: { name: string }) => item.name === "香油",
  );
  assert.deepEqual(oil.amount, { value: 5, unit: "ml" });
  assert.equal(oil.note, undefined);
});

test("粉蒸排骨總時包含原有 30 分鐘醃漬、40 分鐘蒸煮及操作估算", async () => {
  const data = await recipe("steamed-pork-ribs-taro");
  assert.equal(data.timeMinutes, 80);
  assert.match(data.steps[0].text, /醃漬約 30 分鐘/);
  assert.match(data.steps[2].text, /蒸煮 40 分鐘/);
  assert.ok(data.timeMinutes >= 30 + 40);
});

test("辣椒炒肉保留作者當次 200 g 瘦肉與 90 g 肥肉，不誤稱 1:3", async () => {
  const data = await recipe("chili-pork");
  const lean = data.ingredients.find(
    (item: { name: string }) => item.name === "豬梅花肉",
  );
  const fat = data.ingredients.find(
    (item: { name: string }) => item.name === "豬肥肉",
  );
  assert.deepEqual(lean.amount, { value: 200, unit: "g" });
  assert.deepEqual(fat.amount, { value: 90, unit: "g" });
  assert.equal(fat.note, "可帶皮");
});

test("辣椒炒肉分清主來源二荊條與本站糯米椒替代", async () => {
  const data = await recipe("chili-pork");
  assert.equal(
    data.tip,
    "原作者用二荊條辣椒，這裡以糯米椒代替；喜歡辣可另加幾支小辣椒。",
  );
  const pepper = data.ingredients.find(
    (item: { name: string }) => item.name === "糯米椒",
  );
  assert.deepEqual(pepper.amount, { value: 200, unit: "g" });
});

test("獅子頭須確認肉丸熟透入味才加入白菜", async () => {
  const data = await recipe("braised-pork-meatballs");
  assert.match(
    data.steps[5].text,
    /燜煮 15 至 20 分鐘；確認肉丸熟透入味後，加入大白菜/,
  );
});

test("螞蟻上樹只保留來源豬絞肉 300 g，不附未支持的後腿部位", async () => {
  const data = await recipe("ants-climbing-tree");
  const meat = data.ingredients.find(
    (item: { name: string }) => item.name === "豬絞肉",
  );
  assert.ok(meat);
  assert.deepEqual(meat.amount, { value: 300, unit: "g" });
  assert.equal(meat.note, undefined);
  assert.doesNotMatch(JSON.stringify(data), /後腿/);
});
