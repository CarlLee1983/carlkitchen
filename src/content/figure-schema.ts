import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "astro/zod";
import { parse } from "yaml";
import { CONTENT_ID_PATTERN } from "./content-id.ts";

const text = z.string().trim().min(1);
const id = text.regex(CONTENT_ID_PATTERN);

/** 時間軸型互動圖資料；所有顯示文字都必須留在專題旁的 YAML。 */
export const figureSchema = z
  .object({
    alt: text,
    caption: text,
    duration: z.number().positive(),
    keyStage: id,
    variants: z
      .array(
        z.object({ id, label: text, comparisonOnly: z.boolean().optional() }),
      )
      .min(1),
    stages: z
      .array(
        z.object({
          id,
          start: z.number().nonnegative(),
          end: z.number().nonnegative(),
          label: text,
          timeLabel: text.optional(),
          readout: z.union([text, z.record(id, text)]),
        }),
      )
      .min(1),
  })
  .superRefine((figure, context) => {
    const variantIds = figure.variants.map((variant) => variant.id);
    const stageIds = figure.stages.map((stage) => stage.id);
    if (new Set(variantIds).size !== variantIds.length)
      context.addIssue({
        code: "custom",
        path: ["variants"],
        message: "variant 識別值不可重複",
      });
    if (new Set(stageIds).size !== stageIds.length)
      context.addIssue({
        code: "custom",
        path: ["stages"],
        message: "stage 識別值不可重複",
      });
    if (!stageIds.includes(figure.keyStage))
      context.addIssue({
        code: "custom",
        path: ["keyStage"],
        message: "必須指向現有階段",
      });
    figure.stages.forEach((stage, index) => {
      if (stage.start > stage.end || stage.end > figure.duration)
        context.addIssue({
          code: "custom",
          path: ["stages", index],
          message: "階段時間超出時間軸",
        });
      if (index && stage.start < figure.stages[index - 1]!.start)
        context.addIssue({
          code: "custom",
          path: ["stages", index],
          message: "階段必須依時間排序",
        });
      if (typeof stage.readout === "object") {
        for (const variantId of variantIds)
          if (!stage.readout[variantId])
            context.addIssue({
              code: "custom",
              path: ["stages", index, "readout"],
              message: `缺少 ${variantId} 讀數`,
            });
        for (const variantId of Object.keys(stage.readout))
          if (!variantIds.includes(variantId))
            context.addIssue({
              code: "custom",
              path: ["stages", index, "readout"],
              message: `未知 variant：${variantId}`,
            });
      }
    });
  });

export type FigureData = z.infer<typeof figureSchema>;

export function readFigure(
  topicsDir: string,
  topicId: string,
  figureId: string,
): FigureData {
  const file = join(topicsDir, topicId, `${figureId}.figure.yaml`);
  let source: string;
  try {
    source = readFileSync(file, "utf8");
  } catch {
    throw new Error(`專題 ${topicId} 的互動圖 ${figureId} 缺少資料檔：${file}`);
  }
  try {
    return figureSchema.parse(parse(source));
  } catch (error) {
    throw new Error(
      `專題 ${topicId} 的互動圖 ${figureId} 資料檔不符 schema：${file}\n${String(error)}`,
    );
  }
}
