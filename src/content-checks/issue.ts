/** 一項檢查失敗：至少要讓人知道是哪份菜譜、哪個欄位或哪個檔案。 */
export interface Issue {
  /** 菜譜識別值（資料夾名稱）。 */
  recipe?: string;
  /** 食材條目識別值（資料夾名稱）。 */
  ingredient?: string;
  /** 專題識別值（資料夾名稱）。 */
  topic?: string;
  /** 菜譜中的欄位路徑，例如 `steps.0.image`。 */
  field?: string;
  /** 相關檔案路徑。 */
  file?: string;
  message: string;
}

/** 單行輸出：`[識別值] 欄位 (檔案): 說明`。 */
export function formatIssue(issue: Issue): string {
  const parts = [
    issue.recipe ? `[${issue.recipe}]` : "",
    issue.ingredient ? `[食材 ${issue.ingredient}]` : "",
    issue.topic ? `[專題 ${issue.topic}]` : "",
    issue.field ?? "",
    issue.file ? `(${issue.file})` : "",
  ].filter(Boolean);
  return `${parts.join(" ")}${parts.length ? ": " : ""}${issue.message}`;
}
