import type { ScheduledSolarTerm } from "./solar-term-calc";
import { formatSolarTermTime } from "./solar-term-display";

/** 讀取頁面嵌入的節氣時程（建置時由 buildSolarTermSchedule 產生）；沒有時回傳空陣列。 */
export function readSolarTermSchedule(root: ParentNode = document) {
  const data = root.querySelector("[data-solar-term-schedule]")?.textContent;
  const schedule: ScheduledSolarTerm[] = data ? JSON.parse(data) : [];
  return schedule;
}

/** 把交節日期時刻（臺灣時間）填進 <time>。 */
export function fillSolarTermTime(
  time: HTMLTimeElement,
  term: Pick<ScheduledSolarTerm, "date" | "time">,
) {
  const formatted = formatSolarTermTime(term);
  time.dateTime = formatted.dateTime;
  time.title = formatted.title;
  time.textContent = formatted.text;
}
