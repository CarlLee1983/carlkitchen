import { join } from "node:path";
import { existsSync } from "node:fs";
import { checkImageFile, collectImageRefs } from "./images.ts";
import {
  collectBuildFiles,
  listDirectories,
  listSourceIds,
  readImageInfo,
  readYaml,
} from "./io.ts";
import type { Issue } from "./issue.ts";
import { checkLeaks } from "./leaks.ts";
import { isDraft, parseRecipe, type Recipe } from "./recipes.ts";
import { checkSourceCoverage, parseSourceRecord } from "./sources.ts";
import { checkLaunchThreshold } from "./threshold.ts";

export interface ContentCheckOptions {
  recipesDir: string;
  sourcesDir: string;
  distDir: string;
  /** 開啟候選池門檻檢查（部署前）。 */
  launch: boolean;
}

const failure = (file: string, message: string): Issue => ({ file, message });

/** 組合所有檢查；回傳問題清單，空陣列代表通過。 */
export async function runContentChecks(
  options: ContentCheckOptions,
): Promise<Issue[]> {
  const issues: Issue[] = [];

  const recipeIds = listDirectories(options.recipesDir);
  if (!recipeIds) {
    return [
      failure(options.recipesDir, "找不到菜譜目錄（檢查 RECIPES_DIR）。"),
    ];
  }

  // 菜譜：schema、草稿判斷、圖片
  const recipes: { id: string; raw: unknown; data?: Recipe }[] = [];
  for (const id of recipeIds) {
    const file = join(options.recipesDir, id, "recipe.yaml");
    try {
      const raw = readYaml(file);
      if (raw === undefined) {
        issues.push({
          recipe: id,
          file,
          message: "資料夾內沒有 recipe.yaml。",
        });
        continue;
      }
      const { data, issues: schemaIssues } = parseRecipe(id, raw);
      issues.push(...schemaIssues);
      recipes.push({ id, raw, data });
    } catch (error) {
      issues.push({ recipe: id, file, message: (error as Error).message });
    }
  }

  for (const { id, raw, data } of recipes) {
    if (!data || isDraft(raw)) continue;
    for (const ref of collectImageRefs(data)) {
      const info = await readImageInfo(join(options.recipesDir, id, ref.src));
      issues.push(...checkImageFile(id, ref, info));
    }
  }

  // 來源紀錄
  const sourceIds = listSourceIds(options.sourcesDir);
  const sourceUrls: string[] = [];
  for (const id of sourceIds) {
    const file = join(options.sourcesDir, `${id}.yaml`);
    try {
      const { urls, issues: sourceIssues } = parseSourceRecord(
        file,
        readYaml(file),
      );
      sourceUrls.push(...urls);
      issues.push(...sourceIssues);
    } catch (error) {
      issues.push(failure(file, (error as Error).message));
    }
  }
  issues.push(
    ...checkSourceCoverage({
      sourcesDir: options.sourcesDir,
      recipeIds: recipes.map(({ id }) => id),
      publicIds: recipes.filter(({ raw }) => !isDraft(raw)).map(({ id }) => id),
      sourceIds,
    }),
  );

  // 建置輸出洩漏
  if (existsSync(options.distDir)) {
    issues.push(
      ...checkLeaks({
        files: collectBuildFiles(options.distDir),
        draftIds: recipes.filter(({ raw }) => isDraft(raw)).map(({ id }) => id),
        sourceUrls,
      }),
    );
  } else {
    issues.push(failure(options.distDir, "找不到建置輸出目錄，請先執行建置。"));
  }

  // 候選池門檻
  if (options.launch) {
    issues.push(
      ...checkLaunchThreshold(
        recipes.flatMap(({ id, data }) => (data ? [{ id, data }] : [])),
      ),
    );
  }
  return issues;
}
