import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { existsSync } from "node:fs";
import data from "../src/data/solar-terms.json" with { type: "json" };
import {
  selectSolarTerm,
  solarTermArt,
  solarTermsOfYear,
} from "../src/utils/solar-terms.ts";

const terms = [
  { date: "2026-09-23", name: "秋分", time: "06:05" },
  { date: "2026-10-08", name: "寒露", time: "14:29" },
  { date: "2026-10-23", name: "霜降", time: "17:38" },
];
const at = (value: string) => new Date(value);

describe("首頁當前節氣", () => {
  it("交節時刻（臺灣時間）起換成新節氣，前一分鐘仍是上一個", () => {
    assert.equal(
      selectSolarTerm(terms, at("2026-10-08T14:28:59+08:00"))?.name,
      "秋分",
    );
    assert.equal(
      selectSolarTerm(terms, at("2026-10-08T14:29:00+08:00"))?.name,
      "寒露",
    );
    // UTC 06:29 即臺灣 14:29。
    assert.equal(
      selectSolarTerm(terms, at("2026-10-08T06:29:00Z"))?.name,
      "寒露",
    );
    assert.equal(
      selectSolarTerm(terms, at("2026-10-23T17:37:00+08:00"))?.name,
      "寒露",
    );
  });

  it("回傳交節日期與時間供顯示", () => {
    assert.deepEqual(selectSolarTerm(terms, at("2026-10-10T00:00:00+08:00")), {
      date: "2026-10-08",
      name: "寒露",
      time: "14:29",
    });
  });

  it("資料涵蓋範圍外不回傳：第一個節氣之前，或最後一個節氣之後無法確認何時結束", () => {
    assert.equal(
      selectSolarTerm(terms, at("2026-09-23T06:04:00+08:00")),
      undefined,
    );
    assert.equal(
      selectSolarTerm(terms, at("2026-10-23T17:38:00+08:00")),
      undefined,
    );
    assert.equal(
      selectSolarTerm([], at("2026-10-10T00:00:00+08:00")),
      undefined,
    );
  });
});

describe("總覽頁今年的交節紀錄", () => {
  const schedule = [
    { date: "2026-12-22", name: "冬至", time: "23:50" },
    { date: "2027-01-05", name: "小寒", time: "17:00" },
    { date: "2027-12-22", name: "冬至", time: "05:42" },
    { date: "2028-01-06", name: "小寒", time: "04:00" },
  ];

  it("依臺灣時間的年份取該年各節氣，跨年交界以臺灣時間為準", () => {
    // UTC 2026-12-31 16:30 即臺灣 2027-01-01 00:30。
    const names = solarTermsOfYear(
      schedule,
      new Date("2026-12-31T16:30:00Z"),
    ).map((term) => `${term.date}${term.name}`);
    assert.deepEqual(names, ["2027-01-05小寒", "2027-12-22冬至"]);
  });

  it("該年沒有紀錄時回傳空陣列", () => {
    assert.deepEqual(
      solarTermsOfYear(schedule, new Date("2030-06-01T00:00:00+08:00")),
      [],
    );
  });
});

describe("正式節氣資料", () => {
  it("依交節時刻遞增，選取邏輯才不會選錯", () => {
    const starts = data.terms.map((term) =>
      Date.parse(`${term.date}T${term.time}:00+08:00`),
    );
    for (const [index, start] of starts.entries()) {
      const label = data.terms[index]!.date;
      assert.ok(!Number.isNaN(start), label);
      if (index > 0) assert.ok(start > starts[index - 1]!, label);
    }
  });

  it("每個節氣名稱都有對應插畫檔", () => {
    for (const term of data.terms) {
      const file = solarTermArt[term.name as keyof typeof solarTermArt];
      assert.ok(file, `未知節氣名稱：${term.name}`);
      const path = new URL(
        `../src/assets/solar-terms/${file}.webp`,
        import.meta.url,
      );
      assert.ok(existsSync(path), `${term.name} 缺少插畫`);
    }
  });
});
