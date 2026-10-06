import { readdirSync, readFileSync } from "node:fs";

const ROOT = "tests/fixtures/recipes";

export interface FixtureRecipe {
  id: string;
  title: string;
  summary: string;
  heroAlt: string;
  category: "非湯料理" | "湯";
}

// 固定菜譜的 YAML 頂層欄位都是單行純量，逐行取值即可，不引入 YAML 解析套件。
const scalar = (yaml: string, key: string) =>
  yaml.match(new RegExp(`^${key}: (.+)$`, "m"))?.[1]?.trim();

/** 已發布的固定菜譜（排除草稿），依菜名（繁中）排序，與首頁清單規則一致。 */
export function publishedFixtureRecipes(): FixtureRecipe[] {
  return readdirSync(ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const yaml = readFileSync(`${ROOT}/${entry.name}/recipe.yaml`, "utf8");
      return {
        id: entry.name,
        title: scalar(yaml, "title")!,
        summary: scalar(yaml, "summary")!,
        heroAlt:
          yaml.match(/^hero:\n  src: .+\n  alt: (.+)$/m)?.[1]?.trim() ?? "",
        category: scalar(yaml, "category") as FixtureRecipe["category"],
        draft: scalar(yaml, "draft") === "true",
      };
    })
    .filter((recipe) => !recipe.draft)
    .map(({ draft: _draft, ...recipe }) => recipe)
    .sort((a, b) => a.title.localeCompare(b.title, "zh-Hant"));
}
