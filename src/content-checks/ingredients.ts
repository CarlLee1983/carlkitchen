import { join } from "node:path";
import { z } from "astro/zod";
import { createIngredientSchema } from "../content/ingredient-schema.ts";
import { parseIngredientSourceRecord } from "../content/ingredient-sources.ts";
import { checkImageFile } from "./images.ts";
import {
  listDirectories,
  listSourceIds,
  listUnrecognizedSourceFiles,
  readImageInfo,
  readYaml,
} from "./io.ts";
import type { Issue } from "./issue.ts";
import type { BuildFile } from "./leaks.ts";

const schema = createIngredientSchema(z.string());
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const sourceSection =
  /<section\b[^>]*data-ingredient-sources="([^"]+)"[^>]*>([\s\S]*?)<\/section>/g;
const href = /\bhref="([^"]+)"/g;

export interface IngredientCheckOptions {
  ingredientsDir: string;
  ingredientSourcesDir: string;
  publicRecipeIds: readonly string[];
  files: readonly BuildFile[];
}

/** 核對每篇食材的資料、相關菜譜及來源區塊，回傳可供一般洩漏掃描的檔案。 */
export async function checkIngredients(input: IngredientCheckOptions): Promise<{
  issues: Issue[];
  draftIds: string[];
  sourceUrls: string[];
  files: BuildFile[];
}> {
  const issues: Issue[] = [];
  const draftIds: string[] = [];
  const sourceUrls: string[] = [];
  const files = input.files.map((file) => ({ ...file }));
  const ids = listDirectories(input.ingredientsDir);
  if (!ids) {
    return {
      issues: [
        {
          file: input.ingredientsDir,
          message: "找不到食材條目目錄（檢查 INGREDIENTS_DIR）。",
        },
      ],
      draftIds,
      sourceUrls,
      files,
    };
  }
  const knownIds = new Set(ids);
  const sourceIds = new Set(listSourceIds(input.ingredientSourcesDir));
  const sourcesById = new Map<string, { title: string; url: string }[]>();
  for (const id of sourceIds) {
    const sourceFile = join(input.ingredientSourcesDir, `${id}.yaml`);
    if (!knownIds.has(id)) {
      issues.push({
        file: sourceFile,
        message: `孤兒食材來源紀錄：找不到「${id}」。`,
      });
    }
    try {
      const result = parseIngredientSourceRecord(readYaml(sourceFile));
      if (result.success) {
        sourcesById.set(id, result.data.sources);
        sourceUrls.push(...result.data.sources.map((source) => source.url));
      } else {
        issues.push(
          ...result.error.issues.map((issue) => ({
            ingredient: id,
            file: sourceFile,
            field: issue.path.join("."),
            message: issue.message,
          })),
        );
      }
    } catch (error) {
      issues.push({
        ingredient: id,
        file: sourceFile,
        message: (error as Error).message,
      });
    }
  }
  for (const name of listUnrecognizedSourceFiles(input.ingredientSourcesDir)) {
    issues.push({
      file: join(input.ingredientSourcesDir, name),
      message: "無法辨識的食材來源紀錄檔（只接受 <識別值>.yaml）。",
    });
  }

  const publishedRecipes = new Set(input.publicRecipeIds);
  for (const id of ids) {
    const file = join(input.ingredientsDir, id, "ingredient.yaml");
    if (!ID_PATTERN.test(id)) {
      issues.push({
        ingredient: id,
        file,
        message: "食材資料夾名稱必須是小寫英數字以連字號分隔。",
      });
    }
    let raw: unknown;
    try {
      raw = readYaml(file);
    } catch (error) {
      issues.push({ ingredient: id, file, message: (error as Error).message });
      continue;
    }
    if (raw === undefined) {
      issues.push({
        ingredient: id,
        file,
        message: "資料夾內沒有 ingredient.yaml。",
      });
      continue;
    }
    const isDraft =
      typeof raw === "object" &&
      raw !== null &&
      (raw as { draft?: unknown }).draft === true;
    if (isDraft) draftIds.push(id);
    const result = schema.safeParse(raw);
    if (!result.success) {
      issues.push(
        ...result.error.issues.map((issue) => ({
          ingredient: id,
          file,
          field: issue.path.join(".") || undefined,
          message: issue.message,
        })),
      );
      continue;
    }
    const entry = result.data;
    if (entry.draft) continue;
    entry.relatedRecipes.forEach((recipeId, index) => {
      if (!publishedRecipes.has(recipeId)) {
        issues.push({
          ingredient: id,
          file,
          field: `relatedRecipes.${index}`,
          message: `相關菜譜「${recipeId}」不存在或尚未發布。`,
        });
      }
    });
    if (entry.hero) {
      const imageIssues = checkImageFile(
        id,
        { field: "hero", src: entry.hero.src, alt: entry.hero.alt },
        await readImageInfo(join(input.ingredientsDir, id, entry.hero.src)),
      );
      issues.push(
        ...imageIssues.map(({ recipe: _recipe, ...issue }) => ({
          ...issue,
          ingredient: id,
        })),
      );
    }

    const sourceFile = join(input.ingredientSourcesDir, `${id}.yaml`);
    if (!sourceIds.has(id)) {
      issues.push({
        ingredient: id,
        file: sourceFile,
        message: "公開食材條目沒有內部來源紀錄。",
      });
      continue;
    }
    const sources = sourcesById.get(id);
    if (!sources) continue;
    const pagePath = `ingredients/${id}/index.html`;
    const page = files.find((buildFile) => buildFile.path === pagePath);
    if (!page) {
      issues.push({
        ingredient: id,
        file: pagePath,
        message: "公開食材條目缺少建置頁面。",
      });
      continue;
    }
    const sections = [...page.text.matchAll(sourceSection)];
    if (sections.length !== 1 || sections[0]![1] !== id) {
      issues.push({
        ingredient: id,
        file: pagePath,
        message: "公開來源區塊缺失或識別值不符。",
      });
      continue;
    }
    const section = sections[0]![0];
    const links = [...section.matchAll(href)].map((match) =>
      match[1]!.replaceAll("&amp;", "&"),
    );
    const expected = sources.map((source) => source.url);
    if (
      links.length !== expected.length ||
      links.some((url, index) => url !== expected[index])
    ) {
      issues.push({
        ingredient: id,
        file: pagePath,
        message: "公開來源連結與核准紀錄不符。",
      });
      continue;
    }
    // 只消去通過核對的 href，其他位置的網址仍由一般洩漏掃描發現。
    page.text = page.text.replace(
      section,
      section.replace(href, 'href="[approved-ingredient-source]"'),
    );
  }
  return { issues, draftIds, sourceUrls, files };
}
