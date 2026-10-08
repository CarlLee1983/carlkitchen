import type { ScheduledSolarTerm, SolarTermSource } from "./solar-term-calc";

const SOURCE_LABEL = {
  cwa: "資料：中央氣象署",
  computed: "依天文推算",
} satisfies Record<SolarTermSource, string>;

/** 出處標示文字：中央氣象署公告或依天文推算。 */
export const solarTermSourceLabel = (source: SolarTermSource) =>
  SOURCE_LABEL[source];

/** 交節日期時刻（臺灣時間）的顯示文字與 <time> 屬性。 */
export function formatSolarTermTime(
  term: Pick<ScheduledSolarTerm, "date" | "time">,
) {
  const [, month, day] = term.date.split("-").map(Number);
  return {
    dateTime: `${term.date}T${term.time}+08:00`,
    title: "臺灣時間",
    text: `${month} 月 ${day} 日 ${term.time}`,
  };
}
