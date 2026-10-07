import { z } from "astro/zod";

/** 專題識別值（資料夾名即網址 slug）：格式規則和菜譜相同。 */
export const TOPIC_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const nonEmpty = z.string().trim().min(1);

/** 專題是以 Markdown 撰寫的主題文章；frontmatter 的 YAML 日期會被解析成 Date，字串日期也接受。 */
export function createTopicSchema() {
  return z.object({
    title: nonEmpty,
    summary: nonEmpty,
    draft: z.boolean(),
    publishedAt: z.coerce.date(),
  });
}
