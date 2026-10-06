import { z } from "astro/zod";
import { createRecipeSchema } from "../content/recipe-schema.ts";
import type { Issue } from "./issue.ts";

// 圖片欄位以字串代替 Astro 的 image()：這裡只驗證結構，檔案本身由圖片檢查處理。
const recipeSchema = createRecipeSchema(z.string());

export type Recipe = z.output<typeof recipeSchema>;

/** 以內容集合同一份 schema 驗證菜譜；失敗時每個 schema 問題各是一項，附欄位路徑。 */
export function parseRecipe(
  id: string,
  raw: unknown,
): { data?: Recipe; issues: Issue[] } {
  const result = recipeSchema.safeParse(raw);
  if (result.success) return { data: result.data, issues: [] };
  return {
    issues: result.error.issues.map((issue) => ({
      recipe: id,
      field: issue.path.join(".") || undefined,
      message: issue.message,
    })),
  };
}

/** 草稿旗標只認 `draft: true`；schema 驗證失敗的菜譜仍以原始資料判斷。 */
export function isDraft(raw: unknown): boolean {
  return (
    typeof raw === "object" &&
    raw !== null &&
    (raw as { draft?: unknown }).draft === true
  );
}
