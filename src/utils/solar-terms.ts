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
export function selectSolarTerm(
  terms: readonly SolarTerm[],
  now = new Date(),
): SolarTerm | undefined {
  const time = now.getTime();
  const index = terms.findIndex((term) => startOf(term) > time);
  return index > 0 ? terms[index - 1] : undefined;
}
