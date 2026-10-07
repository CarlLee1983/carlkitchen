import { join } from "node:path";
import { z } from "astro/zod";
import {
  createTopicSchema,
  TOPIC_ID_PATTERN,
} from "../content/topic-schema.ts";
import { parseTopicSourceRecord } from "../content/topic-sources.ts";
import { checkHeroAlt, checkImageFile } from "./images.ts";
import {
  listDirectories,
  listSourceIds,
  listUnrecognizedSourceFiles,
  readImageInfo,
  readMarkdown,
  readYaml,
} from "./io.ts";
import type { Issue } from "./issue.ts";
import { sourceCore } from "./leaks.ts";

const schema = createTopicSchema(z.string());

export interface TopicCheckOptions {
  topicsDir: string;
  topicSourcesDir: string;
  publicRecipeIds: readonly string[];
  publicIngredientIds: readonly string[];
}

/** 內文裡 `##`、`###` 標題的純文字（略過程式碼區塊）。 */
function bodyHeadings(body: string): Set<string> {
  const headings = new Set<string>();
  let fence: string | null = null;
  for (const line of body.split(/\r?\n/)) {
    const marker = /^\s*(`{3,}|~{3,})/.exec(line)?.[1];
    if (marker) {
      if (!fence) fence = marker[0]!;
      else if (marker[0] === fence) fence = null;
      continue;
    }
    if (fence) continue;
    const heading = /^#{2,3}\s+(.+?)\s*#*\s*$/.exec(line)?.[1];
    if (heading) headings.add(heading);
  }
  return headings;
}

/**
 * 核對每篇專題的 frontmatter、封面圖與內部來源紀錄；
 * 已發布專題的相關連結只能指向已發布的菜譜與食材條目。
 * 回傳的草稿識別值與核准來源網址交給洩漏掃描。
 */
export async function checkTopics(input: TopicCheckOptions): Promise<{
  issues: Issue[];
  draftIds: string[];
  sourceUrls: string[];
}> {
  const issues: Issue[] = [];
  const draftIds: string[] = [];
  const sourceUrls: string[] = [];
  const ids = listDirectories(input.topicsDir);
  if (!ids) {
    return {
      issues: [
        {
          file: input.topicsDir,
          message: "找不到專題目錄（檢查 TOPICS_DIR）。",
        },
      ],
      draftIds,
      sourceUrls,
    };
  }

  const knownIds = new Set(ids);
  const sourceIds = new Set(listSourceIds(input.topicSourcesDir));
  const approvedByTopic = new Map<string, string[]>();
  const sectionsByTopic = new Map<string, string[]>();
  for (const id of sourceIds) {
    const sourceFile = join(input.topicSourcesDir, `${id}.yaml`);
    if (!knownIds.has(id)) {
      issues.push({
        file: sourceFile,
        message: `孤兒專題來源紀錄：找不到「${id}」。`,
      });
    }
    try {
      const result = parseTopicSourceRecord(readYaml(sourceFile));
      if (result.success) {
        const urls = result.data.sources.map((source) => source.url);
        approvedByTopic.set(id, urls);
        sectionsByTopic.set(
          id,
          result.data.sections.map((section) => section.heading),
        );
        sourceUrls.push(...urls);
      } else {
        issues.push(
          ...result.error.issues.map((issue) => ({
            topic: id,
            file: sourceFile,
            field: issue.path.join("."),
            message: issue.message,
          })),
        );
      }
    } catch (error) {
      issues.push({
        topic: id,
        file: sourceFile,
        message: (error as Error).message,
      });
    }
  }
  for (const name of listUnrecognizedSourceFiles(input.topicSourcesDir)) {
    issues.push({
      file: join(input.topicSourcesDir, name),
      message: "無法辨識的專題來源紀錄檔（只接受 <識別值>.yaml）。",
    });
  }

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
    let markdown: ReturnType<typeof readMarkdown>;
    try {
      markdown = readMarkdown(file);
    } catch (error) {
      issues.push({ topic: id, file, message: (error as Error).message });
      continue;
    }
    if (markdown === undefined) {
      issues.push({ topic: id, file, message: "資料夾內沒有 topic.md。" });
      continue;
    }
    const result = schema.safeParse(markdown.data);
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
    if (topic.draft) {
      draftIds.push(id);
      continue;
    }

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

    if (topic.hero) {
      const ref = {
        field: "hero",
        src: topic.hero.src,
        alt: topic.hero.alt,
      };
      const info = await readImageInfo(join(input.topicsDir, id, ref.src));
      issues.push(
        ...[...checkImageFile(id, ref, info), ...checkHeroAlt(id, ref)].map(
          ({ recipe: _recipe, ...issue }) => ({ ...issue, topic: id }),
        ),
      );
    }

    const sourceFile = join(input.topicSourcesDir, `${id}.yaml`);
    if (!sourceIds.has(id)) {
      issues.push({
        topic: id,
        file: sourceFile,
        message: "公開專題沒有內部來源紀錄。",
      });
      continue;
    }
    const approved = approvedByTopic.get(id);
    if (!approved) continue;
    const headings = bodyHeadings(markdown.body);
    for (const heading of sectionsByTopic.get(id) ?? []) {
      if (!headings.has(heading)) {
        issues.push({
          topic: id,
          file: sourceFile,
          field: "sections",
          message: `段落對照的小節「${heading}」不是專題內文的 ## 或 ### 標題（以純文字照抄標題）。`,
        });
      }
    }
    // 選題參考會公開顯示，不能同時是核准來源。
    const approvedCores = new Set(approved.map(sourceCore));
    topic.references.forEach((reference, index) => {
      if (approvedCores.has(sourceCore(reference.url))) {
        issues.push({
          topic: id,
          file,
          field: `references.${index}.url`,
          message: `選題參考網址 ${reference.url} 同時是核准來源；選題參考會公開顯示，不能當核准來源。`,
        });
      }
    });
  }
  return { issues, draftIds, sourceUrls };
}
