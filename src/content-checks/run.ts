import { join } from "node:path";
import { existsSync } from "node:fs";
import { checkHeroAlt, checkImageFile, collectImageRefs } from "./images.ts";
import { checkIngredients, readIngredients } from "./ingredients.ts";
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
import { checkTopics } from "./topics.ts";
import { isDraft, parseRecipe, type Recipe } from "./recipes.ts";
import { checkSourceCoverage, parseSourceRecord } from "./sources.ts";
import { checkLaunchThreshold } from "./threshold.ts";

export interface ContentCheckOptions {
  recipesDir: string;
  sourcesDir: string;
  ingredientsDir?: string;
  ingredientSourcesDir?: string;
  topicsDir?: string;
  topicSourcesDir?: string;
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
      issues.push(...checkImageFile({ recipe: id }, ref, info));
      issues.push(...checkHeroAlt({ recipe: id }, ref));
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

  // 食材條目只讀一次：食材檢查與專題的相關連結檢查共用
  const ingredients = options.ingredientsDir
    ? readIngredients(options.ingredientsDir)
    : null;

  // 專題：schema、封面圖、內部來源紀錄，以及相關連結只能指向已發布的菜譜與食材條目
  // topicsDir 與 topicSourcesDir 要成對設定；只給一個是設定錯誤，不能靜默略過專題檢查。
  if (Boolean(options.topicsDir) !== Boolean(options.topicSourcesDir)) {
    issues.push(
      failure(
        options.topicsDir ?? options.topicSourcesDir!,
        "專題檢查設定不完整：topicsDir 與 topicSourcesDir 必須同時提供（檢查 TOPICS_DIR、TOPIC_SOURCES_DIR）。",
      ),
    );
  }
  const topicCheck =
    options.topicsDir && options.topicSourcesDir
      ? await checkTopics({
          topicsDir: options.topicsDir,
          topicSourcesDir: options.topicSourcesDir,
          publicRecipeIds: recipes
            .filter(({ raw, data }) => data && !isDraft(raw))
            .map(({ id }) => id),
          publicIngredientIds: (ingredients ?? [])
            .filter(({ entry }) => entry && !entry.draft)
            .map(({ id }) => id),
        })
      : { issues: [], draftIds: [], sourceUrls: [] };
  issues.push(...topicCheck.issues);

  // 建置輸出洩漏
  if (existsSync(options.distDir)) {
    const files = collectBuildFiles(options.distDir);
    const ingredientCheck =
      options.ingredientsDir && options.ingredientSourcesDir
        ? await checkIngredients({
            ingredientsDir: options.ingredientsDir,
            ingredients,
            ingredientSourcesDir: options.ingredientSourcesDir,
            publicRecipeIds: recipes
              .filter(({ raw, data }) => data && !isDraft(raw))
              .map(({ id }) => id),
            files,
          })
        : { issues: [], draftIds: [], sourceUrls: [], files };
    issues.push(...ingredientCheck.issues);
    issues.push(
      ...checkLeaks({
        files: ingredientCheck.files,
        draftIds: recipes.filter(({ raw }) => isDraft(raw)).map(({ id }) => id),
        draftIngredientIds: ingredientCheck.draftIds,
        draftTopicIds: topicCheck.draftIds,
        sourceUrls: [
          ...sourceUrls,
          ...ingredientCheck.sourceUrls,
          ...topicCheck.sourceUrls,
        ],
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
