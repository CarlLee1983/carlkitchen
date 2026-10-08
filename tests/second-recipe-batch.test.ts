import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parse } from "yaml";
import { parseRecipe } from "../src/content-checks/recipes.ts";

const ids = [
  "garlic-okra-tofu",
  "salt-pepper-chicken-thigh",
  "cabbage-rice",
  "radish-pork-rib-soup",
  "shiitake-chicken-congee",
] as const;

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

describe("第二批菜譜的來源與等待時間", () => {
  for (const id of ids) {
    it(`${id} 通過內容契約且具有來源紀錄`, () => {
      const data = recipe(id);
      assert.equal(data.draft, false);
      const sources = parse(
        readFileSync(
          new URL(`../content/sources/${id}.yaml`, import.meta.url),
          "utf8",
        ),
      ) as { urls: string[] };
      assert.ok(sources.urls.length > 0);
      assert.ok(sources.urls.every((url) => url.startsWith("https://")));
    });
  }

  it("雞腿排總時間包含最長兩小時醃漬，並以溫度確認熟度", () => {
    const data = recipe("salt-pepper-chicken-thigh");
    assert.ok(data.timeMinutes > 120);
    assert.match(data.steps[0]!.text, /冷藏/);
    assert.match(data.steps.map((step) => step.text).join(" "), /74\s*°?C/);
  });

  it("排骨湯總時間不得沿用與八十分鐘燉煮矛盾的二十分鐘標示", () => {
    assert.ok(recipe("radish-pork-rib-soup").timeMinutes >= 80);
  });

  it("秋葵與豆腐保留核准的條、盒，不憑空補克數", () => {
    const data = recipe("garlic-okra-tofu");
    assert.deepEqual(
      data.ingredients.find((item) => item.name === "秋葵")?.amount,
      { value: 10, unit: "條" },
    );
    assert.deepEqual(
      data.ingredients.find((item) => /豆腐/.test(item.name))?.amount,
      { value: 1, unit: "盒" },
    );
  });

  it("高麗菜飯保留來源米水杯數且不參與配菜候選", () => {
    const data = recipe("cabbage-rice");
    assert.equal(data.category, "主食");
    assert.equal(data.mealCandidate, false);
    assert.deepEqual(
      data.ingredients.find((item) => item.name === "白米")?.amount,
      { value: 4, unit: "杯" },
    );
    assert.deepEqual(
      data.ingredients.find((item) => item.name === "水")?.amount,
      { value: 3.5, unit: "杯" },
    );
  });

  it("雞肉粥使用來源熟飯份量，雞肉須確認中心熟度", () => {
    const data = recipe("shiitake-chicken-congee");
    assert.equal(data.category, "主食");
    assert.equal(data.mealCandidate, false);
    assert.deepEqual(
      data.ingredients.find((item) => /白飯/.test(item.name))?.amount,
      { value: 1.5, unit: "米杯" },
    );
    assert.match(data.steps.map((step) => step.text).join(" "), /74\s*°?C/);
    assert.doesNotMatch(
      data.steps.map((step) => step.text).join(" "),
      /(?:洗淨|沖洗|清洗|洗乾淨)(?:生)?雞|雞(?:腿)?肉[^。；，]*(?:洗淨|沖洗|清洗|洗乾淨)/,
    );
  });
});
