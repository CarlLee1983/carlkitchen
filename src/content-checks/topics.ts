import { join } from "node:path";
import { z } from "astro/zod";
import {
  createTopicSchema,
  TOPIC_ID_PATTERN,
} from "../content/topic-schema.ts";
import { listDirectories, readFrontmatter } from "./io.ts";
import type { Issue } from "./issue.ts";

const schema = createTopicSchema(z.string());

export interface TopicCheckOptions {
  topicsDir: string;
  publicRecipeIds: readonly string[];
  publicIngredientIds: readonly string[];
}

/** 核對每篇專題的 frontmatter；已發布專題的相關連結只能指向已發布的菜譜與食材條目。 */
export function checkTopics(input: TopicCheckOptions): Issue[] {
  const ids = listDirectories(input.topicsDir);
  if (!ids) {
    return [
      {
        file: input.topicsDir,
        message: "找不到專題目錄（檢查 TOPICS_DIR）。",
      },
    ];
  }
  const issues: Issue[] = [];
  const publishedRecipes = new Set(input.publicRecipeIds);
  const publishedIngredients = new Set(input.publicIngredientIds);
  for (const id of ids) {
    const file = join(input.topicsDir, id, "topic.md");
    if (!TOPIC_ID_PATTERN.test(id)) {
      issues.push({
        topic: id,
        file,
        message: "專題資料夾名稱必須是小寫英數字以連字號分隔。",
      });
    }
    let raw: unknown;
    try {
      raw = readFrontmatter(file);
    } catch (error) {
      issues.push({ topic: id, file, message: (error as Error).message });
      continue;
    }
    if (raw === undefined) {
      issues.push({ topic: id, file, message: "資料夾內沒有 topic.md。" });
      continue;
    }
    const result = schema.safeParse(raw);
    if (!result.success) {
      issues.push(
        ...result.error.issues.map((issue) => ({
          topic: id,
          file,
          field: issue.path.join(".") || undefined,
          message: issue.message,
        })),
      );
      continue;
    }
    const topic = result.data;
    if (topic.draft) continue;
    topic.relatedRecipes.forEach((recipeId, index) => {
      if (!publishedRecipes.has(recipeId)) {
        issues.push({
          topic: id,
          file,
          field: `relatedRecipes.${index}`,
          message: `相關菜譜「${recipeId}」不存在或尚未發布。`,
        });
      }
    });
    topic.relatedIngredients.forEach((ingredientId, index) => {
      if (!publishedIngredients.has(ingredientId)) {
        issues.push({
          topic: id,
          file,
          field: `relatedIngredients.${index}`,
          message: `相關食材條目「${ingredientId}」不存在或尚未發布。`,
        });
      }
    });
  }
  return issues;
}
