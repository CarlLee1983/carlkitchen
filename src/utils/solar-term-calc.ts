// 只在建置時執行：天文推算函式庫不進讀者下載的腳本，瀏覽器端只用 solar-terms.ts。
import { SearchSunLongitude } from "astronomy-engine";
import {
  solarTermArt,
  type SolarTerm,
  type SolarTermName,
} from "./solar-terms.ts";

export type SolarTermSource = "cwa" | "computed";
export interface ScheduledSolarTerm extends SolarTerm {
  /** cwa：中央氣象署公告；computed：依太陽視黃經推算 */
  source: SolarTermSource;
}

/** 公告用完後，推算補到建置年之後幾年。 */
export const COMPUTED_YEARS_AHEAD = 5;

const names = Object.keys(solarTermArt) as SolarTermName[];
const DAY = 86_400_000;
const TAIPEI_OFFSET = 8 * 3_600_000;

/** 四捨五入到分鐘後換成臺灣時間的日期與時刻，格式同中央氣象署公告。 */
export const toTaipei = (instant: Date) => {
  const minute = Math.round(instant.getTime() / 60_000) * 60_000;
  const iso = new Date(minute + TAIPEI_OFFSET).toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
};

/**
 * 推算 fromYear 到 toYear（含）每年 24 個節氣，從小寒排到冬至。
 * 節氣是太陽視黃經每 15° 一個：小寒 285°，之後每個加 15°，冬至 270°。
 */
export function computeSolarTerms(
  fromYear: number,
  toYear: number,
): SolarTerm[] {
  const terms: SolarTerm[] = [];
  for (let year = fromYear; year <= toYear; year++) {
    // 小寒約在 1 月 5、6 日，從臺灣時間元旦起找。
    let from = new Date(Date.UTC(year, 0, 1) - TAIPEI_OFFSET);
    for (const [index, name] of names.entries()) {
      const longitude = (285 + index * 15) % 360;
      const found = SearchSunLongitude(longitude, from, 40);
      if (!found) throw new Error(`${year} 年${name}推算失敗`);
      terms.push({ ...toTaipei(found.date), name });
      from = new Date(found.date.getTime() + DAY);
    }
  }
  return terms;
}

/**
 * 公告資料照用；最後一筆公告之後，以推算值補到 untilYear 年底，另附隔年小寒作為結束界線。
 * 公告資料為必要輸入，須依時間排序。取捨見 docs/adr/0007-solar-terms-official-then-computed.md。
 */
export function solarTermSchedule(
  official: readonly SolarTerm[],
  untilYear: number,
): ScheduledSolarTerm[] {
  const schedule: ScheduledSolarTerm[] = official.map((term) => ({
    ...term,
    source: "cwa",
  }));
  const last = official.at(-1);
  if (!last) throw new Error("缺少中央氣象署節氣公告資料");
  const lastStart = Date.parse(`${last.date}T${last.time}:00+08:00`);
  const firstYear = Number(last.date.slice(0, 4));
  // 多推算隔年小寒當冬至的結束界線，否則最後一年冬至後到年底選不出節氣。
  const [nextLesserCold] = computeSolarTerms(untilYear + 1, untilYear + 1);
  for (const term of [
    ...computeSolarTerms(firstYear, untilYear),
    nextLesserCold!,
  ]) {
    // 同一節氣的推算值與公告可能差一分鐘，只收晚於最後一筆公告交節時刻 24 小時以上的推算值。
    if (Date.parse(`${term.date}T${term.time}:00+08:00`) > lastStart + DAY)
      schedule.push({ ...term, source: "computed" });
  }
  return schedule;
}
