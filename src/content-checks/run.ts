import { join } from "node:path";
import { existsSync } from "node:fs";
import { checkImageFile, collectImageRefs } from "./images.ts";
import {
  collectBuildFiles,
  listDirectories,
  listSourceIds,
  listUnrecognizedSourceFiles,
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

/** 菜譜識別值同時是資料夾名稱與網址 slug：小寫英數與連字號。 */
const RECIPE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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
    const dir = join(options.recipesDir, id);
    const file = join(dir, "recipe.yaml");
    if (!RECIPE_ID_PATTERN.test(id)) {
      issues.push({
        recipe: id,
        file: dir,
        message:
          "菜譜資料夾名稱必須是小寫英數字以連字號分隔（例如 tomato-egg）。",
      });
    }
    // 讀不到或解析失敗的菜譜仍計入識別值，避免它的來源紀錄被多報成孤兒。
    try {
      const raw = readYaml(file);
      if (raw === undefined) {
        issues.push({
          recipe: id,
          file,
          message: "資料夾內沒有 recipe.yaml。",
        });
        recipes.push({ id, raw });
        continue;
      }
      const { data, issues: schemaIssues } = parseRecipe(id, raw);
      // 驗證失敗就沒有可靠的圖片清單，提醒修正後才會檢查圖片。
      issues.push(
        ...schemaIssues.map((issue) =>
          isDraft(raw)
            ? issue
            : { ...issue, message: `${issue.message}（修正後才會檢查圖片）` },
        ),
      );
      recipes.push({ id, raw, data });
    } catch (error) {
      issues.push({
        recipe: id,
        file,
        message: `${(error as Error).message}（修正後才會檢查圖片）`,
      });
      recipes.push({ id, raw: undefined });
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
  for (const name of listUnrecognizedSourceFiles(options.sourcesDir)) {
    issues.push(
      failure(
        join(options.sourcesDir, name),
        "無法辨識的來源紀錄檔（只接受 <識別值>.yaml）。",
      ),
    );
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
