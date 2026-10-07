import type { Issue } from "./issue.ts";
import type { BuildFile } from "./leaks.ts";

/**
 * 網站文案把菜譜定位為「整理自公開資料、僅供參考」，不提製作工具或試做與否。
 * `AI` 限定前後不是英數字，避開檔名雜湊與英文識別字。
 */
const BANNED_TERMS = [
  { term: "AI", pattern: /(?<![A-Za-z0-9])AI(?![A-Za-z0-9])/ },
  { term: "試做", pattern: /試做/ },
];

/** 建置輸出的 HTML 頁面不得出現禁用詞；JS、CSS 等資源不是讀者看到的文案，不檢查。 */
export function checkCopy(files: readonly BuildFile[]): Issue[] {
  return files
    .filter((file) => file.path.endsWith(".html"))
    .flatMap((file) =>
      BANNED_TERMS.filter(({ pattern }) => pattern.test(file.text)).map(
        ({ term }) => ({
          file: file.path,
          message: `頁面文案提到「${term}」；菜譜一律寫成整理自公開資料、僅供參考。`,
        }),
      ),
    );
}
