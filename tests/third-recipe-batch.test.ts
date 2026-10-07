import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parse } from "yaml";
import { parseRecipe } from "../src/content-checks/recipes.ts";

const ids = [
  "sweet-sour-eggplant",
  "soy-braised-baby-potatoes",
  "miso-baked-salmon",
  "japanese-mushroom-rice",
  "creamy-pumpkin-soup",
] as const;

const expectedSources: Record<(typeof ids)[number], string[]> = {
  "sweet-sour-eggplant": [
    "https://caroleasylife.blogspot.com/2020/03/blog-post_28.html",
  ],
  "soy-braised-baby-potatoes": [
    "https://www.maangchi.com/recipe/algamja-jorim",
  ],
  "miso-baked-salmon": [
    "https://www.justonecookbook.com/miso-salmon/",
    "https://www.foodsafety.gov/food-safety-charts/safe-minimum-internal-temperatures",
  ],
  "japanese-mushroom-rice": [
    "https://www.justonecookbook.com/japanese-mushroom-rice/",
  ],
  "creamy-pumpkin-soup": [
    "https://food.ltn.com.tw/article/5001",
    "https://www.kitchenaid.com/countertop-appliances/pinch-of-help/how-to-make-soup-in-a-blender",
    "https://www.kitchenaid.com/countertop-appliances/recipes/sopa-de-calabaza-pumpkin-soup",
  ],
};

function recipe(id: string) {
  const raw: unknown = parse(
    readFileSync(
      new URL(`../content/recipes/${id}/recipe.yaml`, import.meta.url),
      "utf8",
    ),
  );
  const result = parseRecipe(id, raw);
  assert.deepEqual(result.issues, []);
  assert.ok(result.data);
  return result.data;
}

describe("第三批菜譜的來源、份量與安全步驟", () => {
  for (const id of ids) {
    it(`${id} 圖文齊全且具有核准來源紀錄`, () => {
      const data = recipe(id);
      assert.equal(data.draft, false);
      assert.ok(data.hero && data.ingredientsPhoto);
      assert.ok(data.steps.filter((step) => step.image).length >= 3);
      const sources = parse(
        readFileSync(
          new URL(`../content/sources/${id}.yaml`, import.meta.url),
          "utf8",
        ),
      ) as { urls: string[] };
      assert.ok(sources.urls.length > 0);
      assert.ok(sources.urls.every((url) => url.startsWith("https://")));
      assert.deepEqual(
        [...sources.urls].sort(),
        [...expectedSources[id]].sort(),
      );
    });
  }

  it("鮭魚總時間包含兩小時冷藏醃漬，熟度採 63°C", () => {
    const data = recipe("miso-baked-salmon");
    const steps = data.steps.map((step) => step.text).join(" ");
    assert.ok(data.timeMinutes > 120);
    assert.match(steps, /冷藏/);
    assert.match(steps, /63\s*°?C/);
    assert.doesNotMatch(steps, /52|54|半熟/);
    assert.equal(data.protein, true);
    assert.equal(data.vegetable, false);
  });

  it("菇菇炊飯保留菇類總重與奶油，不參與配菜候選", () => {
    const data = recipe("japanese-mushroom-rice");
    assert.equal(data.category, "主食");
    assert.equal(data.mealCandidate, false);
    assert.equal(data.vegetable, false);
    assert.equal(data.protein, false);
    assert.deepEqual(
      data.ingredients.find((item) => item.name === "日本短粒白米")?.amount,
      { value: 300, unit: "g" },
    );
    assert.ok(data.ingredients.some((item) => /奶油/.test(item.name)));
    assert.ok(data.ingredients.some((item) => /高湯/.test(item.name)));
    assert.deepEqual(
      data.ingredients.find((item) => item.name === "綜合菇類")?.amount,
      { value: 200, unit: "g" },
    );
    assert.ok(data.timeMinutes >= 50);
  });

  it("小馬鈴薯保留帶皮整顆做法與先燜後收汁順序", () => {
    const data = recipe("soy-braised-baby-potatoes");
    const steps = data.steps.map((step) => step.text).join(" ");
    assert.match(steps, /20\s*分鐘/);
    assert.match(steps, /4\s*(?:[–～—-]|至)\s*5\s*分鐘/);
    assert.ok(data.timeMinutes >= 30);
    assert.equal(data.vegetable, true);
  });

  it("南瓜濃湯保留培根與原配方大份量，不標為素食", () => {
    const data = recipe("creamy-pumpkin-soup");
    assert.equal(data.category, "湯");
    assert.deepEqual(
      data.ingredients.find((item) => item.name === "南瓜")?.amount,
      { value: 1650, unit: "g" },
    );
    assert.ok(data.ingredients.some((item) => item.name === "培根"));
    assert.doesNotMatch([data.summary, ...data.tags].join(" "), /素食|全素/);
    assert.match(data.steps.map((step) => step.text).join(" "), /月桂葉/);
    const steps = data.steps.map((step) => step.text).join(" ");
    assert.match(steps, /(?:取出|撈出|取走)月桂葉/);
    assert.match(steps, /(?:降溫|冷卻)/);
    assert.match(steps, /分批/);
    assert.match(steps, /(?:說明書|機型說明)/);
  });
});
