import { z } from "astro/zod";
import { solarTermArt } from "../utils/solar-terms.ts";
import { httpUrl } from "./http-url.ts";

const nonEmpty = z.string().trim().min(1);
const solarTermIds = Object.values(solarTermArt) as [string, ...string[]];

/**
 * 節氣說明的內部來源紀錄（單一檔 `solar-terms.yaml`）：格式沿用專題來源紀錄，
 * 核准來源清單 `sources`（至少一筆）加上對照；對照以節氣識別值取代專題的段落標題。
 * 只由內容檢查讀取，不進內容集合也不進公開輸出。
 */
const solarTermSourceSchema = z
  .object({
    sources: z.array(z.object({ title: nonEmpty, url: httpUrl })).min(1),
    terms: z.array(
      z.object({
        id: z.enum(solarTermIds, {
          error: "對照的節氣識別值不是 24 個節氣之一。",
        }),
        urls: z.array(httpUrl).min(1),
      }),
    ),
  })
  .superRefine((record, context) => {
    const approved = new Set(record.sources.map((source) => source.url));
    const seen = new Set<string>();
    record.terms.forEach((term, termIndex) => {
      if (seen.has(term.id)) {
        context.addIssue({
          code: "custom",
          path: ["terms", termIndex, "id"],
          message: `節氣「${term.id}」在對照裡重複列出。`,
        });
      }
      seen.add(term.id);
      term.urls.forEach((url, urlIndex) => {
        if (!approved.has(url)) {
          context.addIssue({
            code: "custom",
            path: ["terms", termIndex, "urls", urlIndex],
            message: `節氣對照的網址 ${url} 沒有列在 sources。`,
          });
        }
      });
    });
  });

export function parseSolarTermSourceRecord(raw: unknown) {
  return solarTermSourceSchema.safeParse(raw);
}
