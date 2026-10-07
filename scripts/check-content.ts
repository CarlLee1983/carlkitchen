// 內容與建置輸出檢查：node --experimental-strip-types scripts/check-content.ts [--launch] [--dist <目錄>]（預設 ASTRO_OUT_DIR，再退回 dist）
// 內容根目錄由 RECIPES_DIR 決定（同內容集合），來源紀錄目錄由 SOURCES_DIR 決定，專題目錄由 TOPICS_DIR、專題來源紀錄由 TOPIC_SOURCES_DIR 決定。
import { parseArgs } from "node:util";
import { formatIssue } from "../src/content-checks/issue.ts";
import { runContentChecks } from "../src/content-checks/run.ts";

const { values } = parseArgs({
  options: {
    launch: { type: "boolean", default: false },
    dist: { type: "string", default: process.env.ASTRO_OUT_DIR || "dist" },
  },
});

const issues = await runContentChecks({
  recipesDir: process.env.RECIPES_DIR || "content/recipes",
  sourcesDir: process.env.SOURCES_DIR || "content/sources",
  ingredientsDir: process.env.INGREDIENTS_DIR || "content/ingredients",
  ingredientSourcesDir:
    process.env.INGREDIENT_SOURCES_DIR || "content/ingredient-sources",
  topicsDir: process.env.TOPICS_DIR || "content/topics",
  topicSourcesDir: process.env.TOPIC_SOURCES_DIR || "content/topic-sources",
  distDir: values.dist,
  launch: values.launch,
});

if (issues.length === 0) {
  console.log(`內容檢查通過${values.launch ? "（含候選池門檻）" : ""}。`);
} else {
  console.error(`內容檢查失敗，共 ${issues.length} 項問題：`);
  for (const issue of issues) console.error(`- ${formatIssue(issue)}`);
  process.exit(1);
}
