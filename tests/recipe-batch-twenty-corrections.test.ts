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

test("客家鹹豬肉總時包含兩天醃漬、煎肉靜置與操作推估", async () => {
  const data = await recipe("hakka-salted-pork");
  assert.match(data.steps[1].text, /冷藏醃漬至少 2 天/);
  assert.match(data.steps[2].text, /12 分鐘.*5 分鐘/);
  // 備料炒鹽放涼抹料 15 + 冷藏 2880 + 洗淨擦乾 5 + 煎 12 + 靜置 5 + 切片 3。
  assert.equal(data.timeMinutes, 15 + 2880 + 5 + 12 + 5 + 3);
});

test("台式脆泡菜總時包含抓鹽、漂洗、冷藏且不重計並行備料", async () => {
  const data = await recipe("taiwanese-pickled-cabbage");
  assert.match(data.steps[1].text, /30 分鐘/);
  assert.match(data.steps[2].text, /5 分鐘/);
  assert.match(data.steps[3].text, /24 小時/);
  // 菜葉紅蘿蔔備料抓鹽 10 + 靜置 30 + 漂洗 5 + 脫水 5 + 拌合裝盒 5 + 冷藏 1440。
  // 蒜、辣椒及糖醋汁可在抓鹽靜置時準備，不再外加一段時間。
  assert.equal(data.timeMinutes, 10 + 30 + 5 + 5 + 5 + 1440);
});

test("胡椒蝦摘要不添加材料與步驟皆未列的麵粉", async () => {
  const data = await recipe("pepper-prawns");
  assert.doesNotMatch(data.summary, /麵粉|裹粉|拍粉/);
  assert.match(data.summary, /白蝦/);
  assert.match(data.summary, /白胡椒粉/);
  assert.equal(
    data.ingredients.some((item: { name: string }) => /麵粉/.test(item.name)),
    false,
  );
});

test("鹹豬肉摘要保留現有調味，不另外加入肉桂粉或高粱酒", async () => {
  const data = await recipe("hakka-salted-pork");
  assert.doesNotMatch(data.summary, /肉桂|高粱/);
  assert.match(data.summary, /五香粉/);
  assert.match(data.summary, /米酒/);
});

test("蒜香炒鴨賞含青蒜苗的圖片對應加入青蒜苗的步驟", async () => {
  const data = await recipe("garlic-fried-duck-meat");
  assert.equal(data.steps[2].image, undefined);
  assert.match(data.steps[3].text, /^放入青蒜苗段/);
  assert.equal(data.steps[3].image.src, "./step-4.webp");
  assert.match(data.steps[3].image.alt, /青蒜苗/);
});

test("第 20 批步驟圖替代文字為完整畫面描述，不是截斷的做法前綴", async () => {
  const ids = [
    "garlic-fried-duck-meat",
    "green-pepper-beef-fried-rice",
    "hakka-salted-pork",
    "needle-mushroom-loofah",
    "pan-fried-hairtail-fish",
    "pepper-prawns",
    "sesame-oil-pork-liver",
    "taiwanese-pickled-cabbage",
    "tree-seeds-steamed-pork",
    "wugeng-changwang",
  ];
  for (const id of ids) {
    const data = await recipe(id);
    for (const [index, step] of data.steps.entries()) {
      if (!step.image) continue;
      assert.match(
        step.image.alt,
        /。$/,
        `${id} 第 ${index + 1} 張圖應為完整句子`,
      );
      assert.equal(
        step.text.startsWith(step.image.alt),
        false,
        `${id} 不可拿操作文字截成圖片描述`,
      );
    }
  }
});
