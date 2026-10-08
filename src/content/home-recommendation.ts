import { z } from "astro/zod";

function validDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

const monthDay = z
  .string()
  .regex(/^\d{2}-\d{2}$/)
  .refine(
    (value) => validDate(`2001-${value}`),
    "須為每年存在的有效月日（MM-DD）；2/29 請使用年度檔期。",
  );
const calendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(validDate, "須為有效日期（YYYY-MM-DD）。");
const priority = z.number().int().positive();

export const homeRecommendationSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("recurring"),
    start: monthDay,
    end: monthDay,
    priority,
  }),
  z
    .object({
      kind: z.literal("dated"),
      start: calendarDate,
      end: calendarDate,
      priority,
    })
    .refine(
      (period) => period.start <= period.end,
      "年度檔期的結束日不得早於開始日。",
    ),
]);

export type HomeRecommendation = z.infer<typeof homeRecommendationSchema>;
