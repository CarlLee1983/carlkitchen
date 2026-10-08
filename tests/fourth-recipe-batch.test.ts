import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parse } from "yaml";
import { parseRecipe } from "../src/content-checks/recipes.ts";

const sources = {
  "celery-tofu": "https://icook.tw/recipes/410117",
  "pan-seared-zucchini": "https://icook.tw/recipes/167509",
  "shrimp-scrambled-eggs": "https://thewoksoflife.com/stir-fried-shrimp-eggs/",
  "coconut-chickpea-curry":
    "https://www.recipetineats.com/brazilian-chickpea-curry/",
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
describe("第四批菜譜的來源、家用單位與做法", () => {
  for (const [id, source] of Object.entries(sources)) {
    it(`${id} 圖文齊全並保留核准來源`, () => {
      const data = recipe(id);
      assert.equal(data.draft, false);
      assert.equal(data.category, "非湯料理");
      assert.equal(data.mealCandidate, true);
      assert.ok(data.hero && data.ingredientsPhoto);
      assert.ok(data.steps.filter((step) => step.image).length >= 3);
      const record = parse(
        readFileSync(
          new URL(`../content/sources/${id}.yaml`, import.meta.url),
          "utf8",
        ),
      ) as { urls: string[] };
      assert.ok(record.urls.includes(source));
    });
  }
  it("芹菜豆干保留三人份與來源主料重量", () => {
    const data = recipe("celery-tofu");
    assert.equal(data.servings, 3);
    assert.equal(data.timeMinutes, 10);
    assert.deepEqual(data.ingredients.find((i) => i.name === "芹菜")?.amount, {
      value: 200,
      unit: "g",
    });
    assert.deepEqual(data.ingredients.find((i) => i.name === "豆干")?.amount, {
      value: 330,
      unit: "g",
    });
    assert.equal(data.vegetable, true);
    assert.equal(data.protein, true);
  });
  it("櫛瓜保留核准的根數、不加油與厚度差", () => {
    const data = recipe("pan-seared-zucchini");
    assert.deepEqual(data.ingredients.find((i) => i.name === "櫛瓜")?.amount, {
      value: 1,
      unit: "根",
    });
    assert.deepEqual(
      data.ingredients.find((i) => i.name === "紅蘿蔔")?.amount,
      { value: 0.5, unit: "根" },
    );
    assert.ok(!data.ingredients.some((i) => /油/.test(i.name)));
    const steps = data.steps.map((s) => s.text).join(" ");
    assert.match(steps, /1\s*cm/);
    assert.match(steps, /0\.5\s*cm/);
    assert.match(steps, /不加油/);
    assert.match(steps, /兩面.*上色/);
  });
  it("蝦仁炒蛋依來源補足時間與熟度後可發布", () => {
    const data = recipe("shrimp-scrambled-eggs");
    assert.equal(data.servings, 4);
    assert.equal(data.draft, false);
    assert.equal(data.timeMinutes, 15);
    assert.match(data.tip ?? "", /看起來熟了/);
    assert.match(data.steps.at(-1)?.text ?? "", /看起來熟了/);
    assert.doesNotMatch(data.tip ?? "", /待補/);
    assert.deepEqual(data.ingredients.find((i) => i.name === "蝦仁")?.amount, {
      value: 340,
      unit: "g",
    });
    assert.deepEqual(data.ingredients.find((i) => i.name === "雞蛋")?.amount, {
      value: 8,
      unit: "顆",
    });
    assert.equal(data.protein, true);
    assert.equal(data.vegetable, false);
  });
  it("鷹嘴豆罐頭標包裝規格，時間涵蓋燉煮且不含煮飯", () => {
    const data = recipe("coconut-chickpea-curry");
    const chickpeas = data.ingredients.find((i) => /鷹嘴豆/.test(i.name));
    assert.deepEqual(chickpeas?.amount, { value: 2, unit: "罐" });
    assert.match(chickpeas?.note ?? "", /400\s*g/);
    assert.match(chickpeas?.note ?? "", /包裝/);
    assert.match(chickpeas?.note ?? "", /瀝乾/);
    assert.ok(data.timeMinutes >= 30);
    assert.match(data.tip ?? "", /不含煮飯/);
    assert.match(
      data.steps.map((s) => s.text).join(" "),
      /12\s*[～–至-]\s*15\s*分鐘/,
    );
    assert.equal(data.protein, true);
  });
});
