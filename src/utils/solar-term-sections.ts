import {
  solarTermArt,
  solarTermSeasons,
  type SolarTermName,
} from "./solar-terms.ts";

export interface SolarTermRecord {
  id: string;
  data: {
    name: string;
    description: string;
    seasonalIngredients: string[];
  };
}

export interface SolarTermSection<Entry extends SolarTermRecord> {
  season: (typeof solarTermSeasons)[number]["season"];
  terms: Entry[];
}

/**
 * 把節氣資料分成春夏秋冬四組，立春排起。沒有任何資料時回傳空陣列（空集合規則：不產生總覽頁）；
 * 有資料就必須 24 筆齊全、名稱與識別值對得上，否則直接報錯，免得頁面少一格或插畫配錯。
 */
export function groupSolarTermsBySeason<Entry extends SolarTermRecord>(
  entries: readonly Entry[],
): SolarTermSection<Entry>[] {
  if (entries.length === 0) return [];
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const expectedIds: string[] = Object.values(solarTermArt);
  const missing = expectedIds.filter((id) => !byId.has(id));
  const unknown = entries
    .map(({ id }) => id)
    .filter((id) => !expectedIds.includes(id));
  if (missing.length > 0 || unknown.length > 0) {
    throw new Error(
      `節氣資料必須恰好 24 筆：缺少 [${missing.join(", ")}]，未知 [${unknown.join(", ")}]。`,
    );
  }
  return solarTermSeasons.map(({ season, names }) => ({
    season,
    terms: names.map((name: SolarTermName) => {
      const id = solarTermArt[name];
      const entry = byId.get(id)!;
      if (entry.data.name !== name) {
        throw new Error(
          `節氣「${id}」的名稱應為「${name}」，資料寫「${entry.data.name}」。`,
        );
      }
      return entry;
    }),
  }));
}
