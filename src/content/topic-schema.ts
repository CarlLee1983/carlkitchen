import { z } from "astro/zod";
import { httpUrl } from "./http-url.ts";

/** 專題識別值（資料夾名即網址 slug）：格式規則和菜譜相同。 */
export const TOPIC_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const nonEmpty = z.string().trim().min(1);
const contentId = nonEmpty.regex(TOPIC_ID_PATTERN);

/**
 * 專題是以 Markdown 撰寫的主題文章；frontmatter 的 YAML 日期會被解析成 Date，字串日期也接受。
 * `image` 由呼叫端注入：內容集合傳入 Astro 的 `image()`，單元測試傳入字串 schema。
 * 相關連結是否指向已發布的頁面，schema 看不到其他集合，由 `check:content` 核對。
 */
export function createTopicSchema<Image extends z.ZodType>(image: Image) {
  return z
    .object({
      title: nonEmpty,
      summary: nonEmpty,
      draft: z.boolean(),
      publishedAt: z.coerce.date(),
      hero: z.object({ src: image, alt: nonEmpty }).optional(),
      relatedRecipes: z.array(contentId),
      relatedIngredients: z.array(contentId),
      references: z.array(
        z.object({ author: nonEmpty, title: nonEmpty, url: httpUrl }),
      ),
    })
    .superRefine((topic, context) => {
      if (!topic.draft && !topic.hero) {
        context.addIssue({
          code: "custom",
          path: ["hero"],
          message: "已發布專題必須有封面。",
        });
      }
    });
}
