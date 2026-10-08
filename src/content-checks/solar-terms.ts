import { existsSync } from "node:fs";
import { join } from "node:path";
import { createSolarTermSchema } from "../content/solar-term-schema.ts";
import { parseSolarTermSourceRecord } from "../content/solar-term-sources.ts";
import { solarTermArt } from "../utils/solar-terms.ts";
import { listSourceIds, listUnrecognizedSourceFiles, readYaml } from "./io.ts";
import type { Issue } from "./issue.ts";

const schema = createSolarTermSchema();

/** 24 個固定識別值，與插畫檔名相同。 */
const SOLAR_TERM_IDS: readonly string[] = Object.values(solarTermArt);

/** 節氣來源紀錄的唯一檔名（24 段共用同一組來源，一檔涵蓋全部）。 */
const SOURCE_RECORD_ID = "solar-terms";

export interface SolarTermCheckOptions {
  solarTermsDir: string;
  solarTermSourcesDir: string;
  publicIngredientIds: readonly string[];
}

/** 一筆通過 schema 的節氣檔；檔名即識別值。 */
interface LoadedSolarTerm {
  id: string;
  file: string;
  data: ReturnType<typeof schema.parse>;
}

/** 目錄內的 `<識別值>.yaml` 識別值，以及既不是 yaml 也不是 `.gitkeep` 的項目名稱；各只讀一次。 */
function scanDirectory(dir: string): { ids: string[]; strays: string[] } {
  return { ids: listSourceIds(dir), strays: listUnrecognizedSourceFiles(dir) };
}

/** 節氣的固定名稱（`solarTermArt` 的鍵），識別值反查。 */
const NAME_BY_ID = new Map<string, string>(
  Object.entries(solarTermArt).map(([name, id]) => [id, name]),
);

/** 讀出節氣資料；schema、YAML、名稱錯誤回報為 issue，schema 或 YAML 錯誤的那筆不進後續檢查。 */
function readSolarTerms(
  dir: string,
  scan: ReturnType<typeof scanDirectory>,
): { issues: Issue[]; terms: LoadedSolarTerm[] } {
  const issues: Issue[] = [];
  const terms: LoadedSolarTerm[] = [];
  for (const id of scan.ids) {
    const file = join(dir, `${id}.yaml`);
    if (!SOLAR_TERM_IDS.includes(id)) {
      issues.push({
        solarTerm: id,
        file,
        message: `未知的節氣識別值「${id}」（只接受 24 個節氣的識別值）。`,
      });
      continue;
    }
    try {
      const parsed = schema.safeParse(readYaml(file));
      if (parsed.success) {
        terms.push({ id, file, data: parsed.data });
        const expectedName = NAME_BY_ID.get(id);
        if (parsed.data.name !== expectedName) {
          issues.push({
            solarTerm: id,
            file,
            field: "name",
            message: `節氣「${id}」的名稱應為「${expectedName}」，資料寫「${parsed.data.name}」。`,
          });
        }
      } else {
        issues.push(
          ...parsed.error.issues.map((issue) => ({
            solarTerm: id,
            file,
            field: issue.path.join(".") || undefined,
            message: issue.message,
          })),
        );
      }
    } catch (error) {
      issues.push({ solarTerm: id, file, message: (error as Error).message });
    }
  }
  for (const name of scan.strays) {
    issues.push({
      file: join(dir, name),
      message: "無法辨識的節氣檔（只接受 <節氣識別值>.yaml）。",
    });
  }
  return { issues, terms };
}

/** 有節氣資料時，24 個識別值必須齊全。 */
function checkComplete(dir: string, present: ReadonlySet<string>): Issue[] {
  return SOLAR_TERM_IDS.filter((id) => !present.has(id)).map((id) => ({
    solarTerm: id,
    file: join(dir, `${id}.yaml`),
    message: `缺少節氣「${id}」；節氣有資料時必須 24 筆齊全。`,
  }));
}

/**
 * 來源紀錄的讀取結果：
 * missing 檔案不存在；invalid 格式有誤（已回報，不再重複報對照缺漏）；ok 附有對照的節氣識別值。
 */
type SourceRecordState =
  | { status: "missing" }
  | { status: "invalid" }
  | { status: "ok"; mapped: ReadonlySet<string> };

/** 讀取節氣來源紀錄；回傳格式問題、不明檔案、讀取結果與核准來源網址。 */
function readSourceRecord(
  dir: string,
  scan: ReturnType<typeof scanDirectory>,
): { issues: Issue[]; file: string; state: SourceRecordState; urls: string[] } {
  const file = join(dir, `${SOURCE_RECORD_ID}.yaml`);
  const strayNames = [
    ...scan.ids
      .filter((id) => id !== SOURCE_RECORD_ID)
      .map((id) => `${id}.yaml`),
    ...scan.strays,
  ];
  const issues: Issue[] = strayNames.map((name) => ({
    file: join(dir, name),
    message: `不明的節氣來源紀錄檔（只接受 ${SOURCE_RECORD_ID}.yaml）。`,
  }));
  if (!scan.ids.includes(SOURCE_RECORD_ID)) {
    return { issues, file, state: { status: "missing" }, urls: [] };
  }
  try {
    const result = parseSolarTermSourceRecord(readYaml(file));
    if (!result.success) {
      issues.push(
        ...result.error.issues.map((issue) => ({
          file,
          field: issue.path.join(".") || undefined,
          message: issue.message,
        })),
      );
      return { issues, file, state: { status: "invalid" }, urls: [] };
    }
    return {
      issues,
      file,
      state: {
        status: "ok",
        mapped: new Set(result.data.terms.map(({ id }) => id)),
      },
      urls: result.data.sources.map((source) => source.url),
    };
  } catch (error) {
    issues.push({ file, message: (error as Error).message });
    return { issues, file, state: { status: "invalid" }, urls: [] };
  }
}

/** 當令食材只能指向已發布的食材條目。 */
function checkSeasonalIngredients(
  terms: readonly LoadedSolarTerm[],
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

/** 每個節氣的說明都要在來源紀錄有對照（對照網址列於 sources 由來源紀錄 schema 把關）。 */
function checkMapping(
  terms: readonly LoadedSolarTerm[],
  sourceFile: string,
  state: SourceRecordState,
): Issue[] {
  if (state.status === "invalid") return [];
  if (state.status === "missing") {
    return [{ file: sourceFile, message: "節氣有資料，但沒有內部來源紀錄。" }];
  }
  return terms
    .filter(({ id }) => !state.mapped.has(id))
    .map(({ id }) => ({
      solarTerm: id,
      file: sourceFile,
      field: "terms",
      message: `節氣「${id}」的說明沒有來源對照。`,
    }));
}

/**
 * 核對節氣資料：目錄為空時只檢查來源紀錄格式；有資料時要求 24 筆齊全、通過 schema、
 * 當令食材指向已發布食材條目，且每筆說明在來源紀錄有對照。
 * 回傳的核准來源網址交給洩漏掃描。
 */
export function checkSolarTerms(input: SolarTermCheckOptions): {
  issues: Issue[];
  sourceUrls: string[];
} {
  if (!existsSync(input.solarTermsDir)) {
    return {
      issues: [
        {
          file: input.solarTermsDir,
          message: "找不到節氣目錄（檢查 SOLAR_TERMS_DIR）。",
        },
      ],
      sourceUrls: [],
    };
  }
  const termScan = scanDirectory(input.solarTermsDir);
  const { issues, terms } = readSolarTerms(input.solarTermsDir, termScan);
  const source = readSourceRecord(
    input.solarTermSourcesDir,
    scanDirectory(input.solarTermSourcesDir),
  );
  issues.push(...source.issues);
  // 空集合規則：目錄沒有任何節氣檔時，不要求齊全與來源對照
  if (termScan.ids.length > 0) {
    issues.push(...checkComplete(input.solarTermsDir, new Set(termScan.ids)));
    issues.push(...checkMapping(terms, source.file, source.state));
  }
  issues.push(
    ...checkSeasonalIngredients(terms, new Set(input.publicIngredientIds)),
  );
  return { issues, sourceUrls: source.urls };
}
