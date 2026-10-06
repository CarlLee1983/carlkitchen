import type { Issue } from "./issue.ts";

export interface BuildFile {
  /** 相對於建置輸出目錄的路徑，以 `/` 分隔。 */
  path: string;
  text: string;
}

const escapeRegExp = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** 網址在輸出中可能出現的寫法：原樣、HTML 跳脫、JSON 跳脫斜線。 */
function urlVariants(url: string): string[] {
  return [url, url.replaceAll("&", "&amp;"), url.replaceAll("/", "\\/")];
}

/**
 * 建置輸出不得含草稿頁面、草稿識別值，也不得含任何內部來源網址。
 * 識別值以「前後不是 slug 字元」比對，避免 `tea` 命中公開的 `tea-egg`。
 */
export function checkLeaks(input: {
  files: readonly BuildFile[];
  draftIds: readonly string[];
  sourceUrls: readonly string[];
}): Issue[] {
  const draftPatterns = input.draftIds.map((id) => ({
    id,
    pattern: new RegExp(`(?<![A-Za-z0-9-])${escapeRegExp(id)}(?![A-Za-z0-9-])`),
  }));
  const issues: Issue[] = [];

  for (const file of input.files) {
    for (const { id, pattern } of draftPatterns) {
      if (pattern.test(file.path)) {
        issues.push({
          recipe: id,
          file: file.path,
          message: "建置輸出含草稿頁面或檔案。",
        });
      } else if (pattern.test(file.text)) {
        issues.push({
          recipe: id,
          file: file.path,
          message: "建置輸出內容含草稿識別值。",
        });
      }
    }
    for (const url of input.sourceUrls) {
      if (urlVariants(url).some((variant) => file.text.includes(variant))) {
        issues.push({
          file: file.path,
          message: `建置輸出含內部來源網址 ${url}。`,
        });
      }
    }
  }
  return issues;
}
