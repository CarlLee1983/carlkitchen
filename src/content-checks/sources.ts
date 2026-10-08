import { join } from "node:path";
import { z } from "astro/zod";
import type { Issue } from "./issue.ts";

/**
 * 內部來源紀錄：`<來源目錄>/<菜譜識別值>.yaml`，至少一個核准來源網址。
 * 只供檢查指令讀取，不進內容集合、頁面或建置輸出。
 */
const sourceRecordSchema = z.object({
  urls: z.array(z.url({ protocol: /^https?$/ })).min(1),
});

export function parseSourceRecord(
  file: string,
  raw: unknown,
): { urls: string[]; issues: Issue[] } {
  const result = sourceRecordSchema.safeParse(raw);
  if (result.success) return { urls: result.data.urls, issues: [] };
  return {
    urls: [],
    issues: result.error.issues.map((issue) => ({
      file,
      field: issue.path.join(".") || undefined,
      message: issue.message,
    })),
  };
}

/**
 * 公開菜譜都要有來源紀錄檔；紀錄檔都要對得到菜譜（草稿的紀錄不算孤兒）。
 * 紀錄內容是否合格由 `parseSourceRecord` 另外回報。
 */
export function checkSourceCoverage(input: {
  sourcesDir: string;
  recipeIds: readonly string[];
  publicIds: readonly string[];
  sourceIds: readonly string[];
}): Issue[] {
  const sources = new Set(input.sourceIds);
  const recipes = new Set(input.recipeIds);
  const missing = input.publicIds
    .filter((id) => !sources.has(id))
    .map((id): Issue => ({
      recipe: id,
      file: join(input.sourcesDir, `${id}.yaml`),
      message: "公開菜譜沒有內部來源紀錄。",
    }));
  const orphans = input.sourceIds
    .filter((id) => !recipes.has(id))
    .map((id): Issue => ({
      file: join(input.sourcesDir, `${id}.yaml`),
      message: `孤兒來源紀錄：找不到識別值為「${id}」的菜譜。`,
    }));
  return [...missing, ...orphans];
}

/** 同一個楊桃食譜頁只能對應一張菜譜；共用的一般參考網址不在此限。 */
export function checkYtowerRecipeSourceReuse(
  records: readonly { id: string; file: string; urls: readonly string[] }[],
): Issue[] {
  const idsByUrl = new Map<string, string[]>();
  for (const record of records) {
    for (const rawUrl of record.urls) {
      let url: URL;
      try {
        url = new URL(rawUrl);
      } catch {
        continue;
      }
      if (!/(^|\.)ytower\.com\.tw$/i.test(url.hostname)) continue;
      url.hash = "";
      const key = url.toString();
      const ids = idsByUrl.get(key) ?? [];
      ids.push(record.id);
      idsByUrl.set(key, ids);
    }
  }

  const issues: Issue[] = [];
  for (const [url, ids] of idsByUrl) {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length < 2) continue;
    for (const id of uniqueIds) {
      const record = records.find((item) => item.id === id);
      if (!record) continue;
      issues.push({
        recipe: id,
        file: record.file,
        message: `楊桃食譜來源與 ${uniqueIds.filter((other) => other !== id).join("、")} 重複（${url}）；請確認是否為重複菜譜。`,
      });
    }
  }
  return issues;
}
