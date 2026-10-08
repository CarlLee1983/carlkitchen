/** 網站品牌名：頁首、首頁標題與 `<title>` 後綴共用。 */
export const SITE_NAME = "煮奔";

/** 網站標語：首頁題字與關於頁共用。 */
export const SITE_TAGLINE = "陪你把今天的飯煮出來。";

const LAUNCH_YEAR = 2026;

/** 版權年份：建站當年只顯示一年，之後顯示「建站年–當年」。 */
export function copyrightYears(currentYear: number): string {
  return currentYear > LAUNCH_YEAR
    ? `${LAUNCH_YEAR}–${currentYear}`
    : String(LAUNCH_YEAR);
}
