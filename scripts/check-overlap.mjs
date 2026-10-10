// 照抄檢查彙總：pnpm check:overlap <識別值...>
//   菜譜識別值：抓 content/sources/<id>.yaml 的每個網址，逐一與菜譜比對。
//   專題識別值（content/topics/<id>/topic.md 存在）：與它連到的每份菜譜比對，不抓網路。
// 任何 COPIED 以代碼 1 結束；只有 FETCH_FAIL 則代碼 0 並印警示。用法錯代碼 2。
// 內容目錄沿用 RECIPES_DIR、TOPICS_DIR、SOURCES_DIR 環境變數。
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse } from "yaml";
import { topicRecipeIds } from "../.claude/skills/recipe-making/scripts/overlap-lib.mjs";

const scriptsDir = ".claude/skills/recipe-making/scripts";
const overlapScript = join(scriptsDir, "overlap.mjs");
const recipesDir = process.env.RECIPES_DIR || "content/recipes";
const topicsDir = process.env.TOPICS_DIR || "content/topics";
const sourcesDir = process.env.SOURCES_DIR || "content/sources";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130 Safari/537.36";

const ids = process.argv.slice(2);
if (ids.length === 0) {
  console.error("用法：pnpm check:overlap <菜譜或專題識別值...>");
  process.exit(2);
}

const tmp = mkdtempSync(join(tmpdir(), "check-overlap-"));
let tmpIndex = 0;

/**
 * @param {string} target
 * @param {string} source
 */
function runOverlap(target, source) {
  const result = spawnSync(process.execPath, [overlapScript, target, source], {
    encoding: "utf8",
  });
  return { copied: result.status !== 0, output: result.stdout.trim() };
}

// 抓網址存成暫存 HTML，失敗回傳 null
/** @param {string} url */
function fetchPage(url) {
  const output = join(tmp, `page-${(tmpIndex += 1)}.html`);
  const host = new URL(url).hostname;
  const isYtower = host === "ytower.com.tw" || host.endsWith(".ytower.com.tw");
  /** @type {[string, string[]]} */
  const [command, args] = isYtower
    ? ["bash", [join(scriptsDir, "fetch-ytower.sh"), url, output]]
    : [
        "curl",
        [
          "--fail",
          "--silent",
          "--show-error",
          "--location",
          "--connect-timeout",
          "10",
          "--max-time",
          "30",
          "--user-agent",
          USER_AGENT,
          "--output",
          output,
          url,
        ],
      ];
  const result = spawnSync(command, args, { encoding: "utf8" });
  return result.status === 0 ? output : null;
}

// 回傳 [{ id, source, status, output }]
/** @param {string} id */
function checkRecipe(id) {
  const recipePath = join(recipesDir, id, "recipe.yaml");
  const sourcePath = join(sourcesDir, `${id}.yaml`);
  if (!existsSync(recipePath) || !existsSync(sourcePath)) {
    console.error(`找不到 ${recipePath} 或 ${sourcePath}。`);
    process.exit(2);
  }
  const urls = parse(readFileSync(sourcePath, "utf8")).urls ?? [];
  return urls.map((/** @type {string} */ url) => {
    const page = fetchPage(url);
    if (!page) return { id, source: url, status: "FETCH_FAIL", output: "" };
    const { copied, output } = runOverlap(recipePath, page);
    return { id, source: url, status: copied ? "COPIED" : "OK", output };
  });
}

/** @param {string} id */
function checkTopic(id) {
  const topicPath = join(topicsDir, id, "topic.md");
  return topicRecipeIds(readFileSync(topicPath, "utf8")).map((recipeId) => {
    const recipePath = join(recipesDir, recipeId, "recipe.yaml");
    if (!existsSync(recipePath)) {
      return {
        id,
        source: recipeId,
        status: "FETCH_FAIL",
        output: "找不到菜譜檔",
      };
    }
    const { copied, output } = runOverlap(topicPath, recipePath);
    return { id, source: recipeId, status: copied ? "COPIED" : "OK", output };
  });
}

const results = ids.flatMap((id) =>
  existsSync(join(topicsDir, id, "topic.md"))
    ? checkTopic(id)
    : checkRecipe(id),
);
for (const { id, source, status, output } of results) {
  console.log(`${id}\t${source}\t${status}`);
  if (status === "COPIED") console.log(output);
}

if (results.some((r) => r.status === "COPIED")) process.exit(1);
if (results.some((r) => r.status === "FETCH_FAIL")) {
  console.warn("警示：部分來源無法讀取，這些來源尚未比對，請人工確認。");
}
