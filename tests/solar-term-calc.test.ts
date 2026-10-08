import assert from "node:assert/strict";
import { describe, it } from "node:test";
import data from "../src/data/solar-terms.json" with { type: "json" };
import {
  computeSolarTerms,
  solarTermSchedule,
  toTaipei,
} from "../src/utils/solar-term-calc.ts";

// 年份從公告資料推導，補進新年度公告後測試不用改。
const yearOf = (term: { date: string }) => Number(term.date.slice(0, 4));
const firstYear = yearOf(data.terms[0]!);
const lastYear = yearOf(data.terms.at(-1)!);

const start = (term: { date: string; time: string }) =>
  Date.parse(`${term.date}T${term.time}:00+08:00`);

describe("天文推算節氣", () => {
  it("與中央氣象署公告逐筆比對：日期相同、時刻差不超過 2 分鐘", () => {
    const computed = computeSolarTerms(firstYear, lastYear);
    assert.equal(computed.length, data.terms.length);
    for (const [index, official] of data.terms.entries()) {
      const term = computed[index]!;
      assert.equal(term.name, official.name, official.date);
      assert.equal(term.date, official.date, official.name);
      assert.ok(
        Math.abs(start(term) - start(official)) <= 2 * 60_000,
        `${official.name} ${official.date} 公告 ${official.time} 推算 ${term.time}`,
      );
    }
  });

  it("一年 24 個節氣，從小寒排到冬至", () => {
    const year = computeSolarTerms(2030, 2030);
    assert.equal(year.length, 24);
    assert.equal(year[0]!.name, "小寒");
    assert.equal(year.at(-1)!.name, "冬至");
    assert.ok(year.every((term) => term.date.startsWith("2030-")));
  });

  it("四捨五入到分鐘後換成臺灣時間，跨午夜時進到隔天", () => {
    assert.deepEqual(toTaipei(new Date("2028-01-05T15:59:30Z")), {
      date: "2028-01-06",
      time: "00:00",
    });
    assert.deepEqual(toTaipei(new Date("2028-01-05T15:59:29Z")), {
      date: "2028-01-05",
      time: "23:59",
    });
  });
});

describe("節氣時程：公告為主，推算補位", () => {
  const official = [
    { date: "2027-12-07", name: "大雪", time: "16:37" },
    { date: "2027-12-22", name: "冬至", time: "10:42" },
  ];

  it("公告涵蓋的節氣標示中央氣象署，之後接上推算值並標示推算", () => {
    const schedule = solarTermSchedule(official, 2028);
    assert.deepEqual(schedule.slice(0, 2), [
      { ...official[0], source: "cwa" },
      { ...official[1], source: "cwa" },
    ]);
    const next = schedule[2]!;
    assert.equal(next.name, "小寒");
    assert.ok(next.date.startsWith("2028-01-"));
    assert.equal(next.source, "computed");
    assert.equal(schedule.at(-1)!.name, "冬至");
    assert.ok(schedule.at(-1)!.date.startsWith("2028-12-"));
  });

  it("依交節時刻遞增且沒有重複節氣", () => {
    const untilYear = lastYear + 3;
    const schedule = solarTermSchedule(data.terms, untilYear);
    const starts = schedule.map(start);
    for (let index = 1; index < starts.length; index++)
      assert.ok(starts[index]! > starts[index - 1]!, schedule[index]!.date);
    assert.equal(schedule.length, data.terms.length + 24 * 3);
  });

  it("沒有公告資料時拋錯，不默默只推算一年", () => {
    assert.throws(() => solarTermSchedule([], 2030), /缺少中央氣象署/);
  });
});
