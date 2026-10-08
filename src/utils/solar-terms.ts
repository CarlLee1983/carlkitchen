/** 節氣名稱對應 src/assets/solar-terms/ 的插畫檔名。 */
export const solarTermArt = {
  小寒: "xiaohan",
  大寒: "dahan",
  立春: "lichun",
  雨水: "yushui",
  驚蟄: "jingzhe",
  春分: "chunfen",
  清明: "qingming",
  穀雨: "guyu",
  立夏: "lixia",
  小滿: "xiaoman",
  芒種: "mangzhong",
  夏至: "xiazhi",
  小暑: "xiaoshu",
  大暑: "dashu",
  立秋: "liqiu",
  處暑: "chushu",
  白露: "bailu",
  秋分: "qiufen",
  寒露: "hanlu",
  霜降: "shuangjiang",
  立冬: "lidong",
  小雪: "xiaoxue",
  大雪: "daxue",
  冬至: "dongzhi",
} as const;
export type SolarTermName = keyof typeof solarTermArt;

/** 節氣總覽的四季分組，從立春排起；季節只在這裡定義，節氣資料不重複記錄。 */
export const solarTermSeasons = [
  { season: "春", names: ["立春", "雨水", "驚蟄", "春分", "清明", "穀雨"] },
  { season: "夏", names: ["立夏", "小滿", "芒種", "夏至", "小暑", "大暑"] },
  { season: "秋", names: ["立秋", "處暑", "白露", "秋分", "寒露", "霜降"] },
  { season: "冬", names: ["立冬", "小雪", "大雪", "冬至", "小寒", "大寒"] },
] as const satisfies readonly {
  season: string;
  names: readonly SolarTermName[];
}[];

export interface SolarTerm {
  /** 交節日期（臺灣時間），YYYY-MM-DD */
  date: string;
  name: string;
  /** 交節時刻（臺灣時間），HH:mm */
  time: string;
}

const startOf = (term: SolarTerm) =>
  new Date(`${term.date}T${term.time}:00+08:00`).getTime();

/**
 * 回傳 now 所在的節氣：已交節的最近一個。資料須依時間排序。
 * 最後一個節氣之後無法確認何時結束，與第一個之前一樣不回傳，由呼叫端隱藏。
 */
export function selectSolarTerm<Term extends SolarTerm>(
  terms: readonly Term[],
  now = new Date(),
): Term | undefined {
  const time = now.getTime();
  const index = terms.findIndex((term) => startOf(term) > time);
  return index > 0 ? terms[index - 1] : undefined;
}

const TAIPEI_OFFSET = 8 * 3_600_000;

/** 讀者當下臺灣時間所在年份的各節氣交節紀錄，保留原排序；該年沒有紀錄就是空陣列。 */
export function solarTermsOfYear<Term extends SolarTerm>(
  terms: readonly Term[],
  now = new Date(),
): Term[] {
  const year = new Date(now.getTime() + TAIPEI_OFFSET).getUTCFullYear();
  return terms.filter((term) => term.date.startsWith(`${year}-`));
}
