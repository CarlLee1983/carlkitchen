import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { groupSolarTermsBySeason } from "../src/utils/solar-term-sections.ts";
import { solarTermArt } from "../src/utils/solar-terms.ts";

const entries = Object.entries(solarTermArt).map(([name, id]) => ({
  id,
  data: { name, description: `${name}說明`, seasonalIngredients: [] },
}));

describe("節氣總覽分組", () => {
  it("依春夏秋冬分四組，從立春排起、大寒結束", () => {
    // 輸入順序打亂（集合讀取順序不保證），輸出順序仍固定。
    const sections = groupSolarTermsBySeason([...entries].reverse());
    assert.deepEqual(
      sections.map(({ season }) => season),
      ["春", "夏", "秋", "冬"],
    );
    assert.deepEqual(
      sections.map(({ terms }) => terms.map(({ data }) => data.name)),
      [
        ["立春", "雨水", "驚蟄", "春分", "清明", "穀雨"],
        ["立夏", "小滿", "芒種", "夏至", "小暑", "大暑"],
        ["立秋", "處暑", "白露", "秋分", "寒露", "霜降"],
        ["立冬", "小雪", "大雪", "冬至", "小寒", "大寒"],
      ],
    );
  });

  it("沒有任何節氣資料時回傳空陣列（不產生總覽頁）", () => {
    assert.deepEqual(groupSolarTermsBySeason([]), []);
  });

  it("有資料卻缺節氣時直接報錯並列出缺的識別值", () => {
    assert.throws(
      () =>
        groupSolarTermsBySeason(entries.filter(({ id }) => id !== "lidong")),
      /lidong/,
    );
  });

  it("出現未知識別值時報錯", () => {
    assert.throws(
      () =>
        groupSolarTermsBySeason([
          ...entries,
          { id: "unknown", data: entries[0]!.data },
        ]),
      /unknown/,
    );
  });

  it("名稱與識別值對不上時報錯", () => {
    const wrong = entries.map((entry) =>
      entry.id === "lichun"
        ? { ...entry, data: { ...entry.data, name: "雨水" } }
        : entry,
    );
    assert.throws(() => groupSolarTermsBySeason(wrong), /lichun/);
  });
});
