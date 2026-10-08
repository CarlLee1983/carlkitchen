import { z } from "astro/zod";
import { TOPIC_ID_PATTERN } from "./topic-schema.ts";

const nonEmpty = z.string().trim().min(1);

/**
 * 節氣是固定 24 筆的結構化資料，識別值（檔名）與 `src/assets/solar-terms/` 的插畫檔名相同。
 * 所屬季節由識別值決定（`solarTermSeasons`），不在資料裡重複記錄；沒有 `draft`：整頁一次送審。
 * 當令食材是已發布食材條目的識別值，可為空；是否真的指向已發布條目，schema 看不到其他集合，由 `check:content` 核對。
 */
export function createSolarTermSchema() {
  return z.object({
    name: nonEmpty,
    description: nonEmpty,
    seasonalIngredients: z.array(nonEmpty.regex(TOPIC_ID_PATTERN)),
  });
}
