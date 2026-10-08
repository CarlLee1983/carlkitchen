import { existsSync } from "node:fs";
import { join } from "node:path";
import { createSolarTermSchema } from "../content/solar-term-schema.ts";
import { listSourceIds, readYaml } from "./io.ts";
import type { Issue } from "./issue.ts";

const schema = createSolarTermSchema();

export interface SolarTermCheckOptions {
  solarTermsDir: string;
  publicIngredientIds: readonly string[];
}

/** 一筆通過 schema 的節氣資料；檔名即識別值。 */
interface SolarTermRecord {
  id: string;
  file: string;
  data: ReturnType<typeof schema.parse>;
}

/**
 * 讀出節氣資料；讀不到或不合 schema 的檔案略過。
 * schema 與齊全檢查由後續工單加入這裡的 issues；建置時 Astro 的內容集合也會擋下 schema 錯誤。
 */
function readSolarTerms(dir: string): SolarTermRecord[] {
  return listSourceIds(dir).flatMap((id) => {
    const file = join(dir, `${id}.yaml`);
    const parsed = schema.safeParse(readYaml(file));
    return parsed.success ? [{ id, file, data: parsed.data }] : [];
  });
}

/** 當令食材只能指向已發布的食材條目。 */
function checkSeasonalIngredients(
  terms: readonly SolarTermRecord[],
  publishedIngredients: ReadonlySet<string>,
): Issue[] {
  return terms.flatMap(({ id, file, data }) =>
    data.seasonalIngredients.flatMap((target, index) =>
      publishedIngredients.has(target)
        ? []
        : [
            {
              solarTerm: id,
              file,
              field: `seasonalIngredients.${index}`,
              message: `當令食材「${target}」不存在或尚未發布。`,
            },
          ],
    ),
  );
}

/** 核對節氣資料；目前只檢查當令食材連結，目錄為空時通過。 */
export function checkSolarTerms(input: SolarTermCheckOptions): Issue[] {
  if (!existsSync(input.solarTermsDir)) {
    return [
      {
        file: input.solarTermsDir,
        message: "找不到節氣目錄（檢查 SOLAR_TERMS_DIR）。",
      },
    ];
  }
  const terms = readSolarTerms(input.solarTermsDir);
  return checkSeasonalIngredients(terms, new Set(input.publicIngredientIds));
}
