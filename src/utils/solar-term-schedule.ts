import solarTerms from "../data/solar-terms.json";
import { COMPUTED_YEARS_AHEAD, solarTermSchedule } from "./solar-term-calc";

/**
 * 建置時產生的節氣時程：中央氣象署公告優先，用完後以天文推算補位，
 * 資料不會在兩次部署之間突然用完（ADR 0007）。
 */
export const buildSolarTermSchedule = (now = new Date()) =>
  solarTermSchedule(solarTerms.terms, now.getFullYear() + COMPUTED_YEARS_AHEAD);
