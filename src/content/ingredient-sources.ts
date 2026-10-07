import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "astro/zod";
import { parse } from "yaml";
import { httpUrl } from "./http-url.ts";

const sourceSchema = z.object({
  sources: z
    .array(
      z.object({
        title: z.string().trim().min(1),
        url: httpUrl,
      }),
    )
    .min(1),
});

export type IngredientSource = z.output<typeof sourceSchema>["sources"][number];

/** 編審來源紀錄是公開來源連結的唯一資料來源。 */
export function parseIngredientSourceRecord(raw: unknown) {
  return sourceSchema.safeParse(raw);
}

/** 開發預覽可在來源紀錄尚未完成時顯示草稿；發布由內容檢查把關。 */
export function readIngredientSources(id: string): IngredientSource[] {
  const dir =
    process.env.INGREDIENT_SOURCES_DIR || "content/ingredient-sources";
  const file = join(dir, `${id}.yaml`);
  if (!existsSync(file)) return [];
  const result = parseIngredientSourceRecord(parse(readFileSync(file, "utf8")));
  if (!result.success) throw new Error(`${file}: 食材來源紀錄格式錯誤。`);
  return result.data.sources;
}
