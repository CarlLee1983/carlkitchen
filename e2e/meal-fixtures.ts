import { readdirSync, readFileSync } from "node:fs";
import type { APIRequestContext } from "@playwright/test";
import { z } from "astro/zod";
import { parse } from "yaml";
import { createRecipeSchema } from "../src/content/recipe-schema";
import {
  candidatesFromRecipes,
  type Candidate,
} from "../src/meal-planner/index";

export type MealFixture = Candidate & { title: string };

const recipeSchema = createRecipeSchema(z.string());

/**
 * 讀取某個固定菜譜根目錄的配菜候選：候選池規則交給引擎的 `candidatesFromRecipes`，
 * 這裡只合併顯示用的菜名；測試的數量與菜名都由這裡推得。
 */
export function mealCandidates(root: string): MealFixture[] {
  const recipes = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      id: entry.name,
      data: recipeSchema.parse(
        parse(readFileSync(`${root}/${entry.name}/recipe.yaml`, "utf8")),
      ),
    }));
  const titles = new Map(recipes.map(({ id, data }) => [id, data.title]));
  return candidatesFromRecipes(recipes).map((item) => ({
    ...item,
    title: titles.get(item.id)!,
  }));
}

/**
 * 抓實際被 serve 的 `/meal/`，讀出內嵌的候選池。用來確認 Playwright 連到的
 * 是預期的站台，而不是殘留的另一份 preview。
 */
export async function servedCandidates(
  request: APIRequestContext,
): Promise<Candidate[]> {
  const response = await request.get("/meal/");
  const html = await response.text();
  const json = html.match(
    /<script type="application\/json" id="meal-data">(.*?)<\/script>/s,
  )?.[1];
  if (!json) throw new Error("`/meal/` 找不到 #meal-data");
  return (JSON.parse(json) as { candidates: Candidate[] }).candidates;
}

/** 斷言實際被 serve 的候選池與固定資料一致；不一致時說明是哪份站台。 */
export async function expectServedPool(
  request: APIRequestContext,
  expected: readonly MealFixture[],
) {
  const byId = (a: { id: string }, b: { id: string }) =>
    a.id.localeCompare(b.id);
  const served = (await servedCandidates(request)).sort(byId);
  const wanted = expected.map(({ title: _title, ...item }) => item).sort(byId);
  if (JSON.stringify(served) !== JSON.stringify(wanted)) {
    throw new Error(
      `被 serve 的站台候選池與固定資料不符（可能重用了殘留的 preview）：\n實際 ${JSON.stringify(served)}\n預期 ${JSON.stringify(wanted)}`,
    );
  }
}
