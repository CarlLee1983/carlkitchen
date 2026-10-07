import { z } from "astro/zod";

const nonEmpty = z.string().trim().min(1);
const httpUrl = z.url({ protocol: /^https?$/ });

/**
 * 專題的內部來源紀錄：核准來源清單，以及小節標題到採用來源網址的段落對照。
 * 只由內容檢查讀取，不進內容集合也不進公開輸出；選題參考放在專題 frontmatter，不在這裡。
 */
const topicSourceSchema = z
  .object({
    sources: z.array(z.object({ title: nonEmpty, url: httpUrl })).min(1),
    sections: z.array(
      z.object({ heading: nonEmpty, urls: z.array(httpUrl).min(1) }),
    ),
  })
  .superRefine((record, context) => {
    const approved = new Set(record.sources.map((source) => source.url));
    record.sections.forEach((section, sectionIndex) => {
      section.urls.forEach((url, urlIndex) => {
        if (!approved.has(url)) {
          context.addIssue({
            code: "custom",
            path: ["sections", sectionIndex, "urls", urlIndex],
            message: `段落對照的網址 ${url} 沒有列在 sources。`,
          });
        }
      });
    });
  });

export function parseTopicSourceRecord(raw: unknown) {
  return topicSourceSchema.safeParse(raw);
}
