import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatSolarTermTime,
  solarTermSourceLabel,
} from "../src/utils/solar-term-display.ts";

describe("節氣交節顯示", () => {
  it("日期與時刻格式為「M 月 D 日 HH:mm」，月日不補零", () => {
    assert.equal(
      formatSolarTermTime({ date: "2026-03-05", time: "09:07" }).text,
      "3 月 5 日 09:07",
    );
    assert.equal(
      formatSolarTermTime({ date: "2026-10-23", time: "17:38" }).text,
      "10 月 23 日 17:38",
    );
  });

  it("dateTime 帶臺灣時區位移，title 標明臺灣時間", () => {
    const formatted = formatSolarTermTime({
      date: "2026-10-08",
      time: "14:29",
    });
    assert.equal(formatted.dateTime, "2026-10-08T14:29+08:00");
    assert.equal(formatted.title, "臺灣時間");
  });

  it("出處標示：公告資料與天文推算各有文字", () => {
    assert.equal(solarTermSourceLabel("cwa"), "資料：中央氣象署");
    assert.equal(solarTermSourceLabel("computed"), "依天文推算");
  });
});
