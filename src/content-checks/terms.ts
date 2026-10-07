import { TAIWAN_TERMS } from "../content/taiwan-terms.ts";
import type { Issue } from "./issue.ts";

/** 用詞問題所屬的內容：問題會帶上這個識別欄位（菜譜、食材條目或專題）。 */
export type TermOwner = Pick<Issue, "recipe" | "ingredient" | "topic">;

/** 避免詞對應的採用詞與說明。 */
const AVOID_INDEX = new Map(
  TAIWAN_TERMS.flatMap(({ use, avoid, note, except = [] }) =>
    avoid.map((term) => [term, { use, note, except }] as const),
  ),
);

/** 長詞排前面，「不粘鍋」才不會被較短的「粘鍋」攔走。 */
const AVOID_PATTERN = new RegExp(
  [...AVOID_INDEX.keys()]
    .sort((a, b) => b.length - a.length)
    .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|"),
  "g",
);

/** 被「」或『』包住的引述是在說明用詞，網址不是文字內容，兩者都不算使用。 */
const EXEMPT_PATTERN = /「[^」]*」|『[^』]*』|https?:\/\/\S+/g;

/** 這些鍵放的是網址或檔案路徑，不是文字。 */
const NON_TEXT_KEYS = new Set(["url", "urls", "src"]);

/** 命中位置（`index` 起的 `term`）是否落在合法片語 `phrase` 之內。 */
function insidePhrase(
  text: string,
  index: number,
  term: string,
  phrase: string,
) {
  for (
    let k = phrase.indexOf(term);
    k !== -1;
    k = phrase.indexOf(term, k + 1)
  ) {
    if (text.startsWith(phrase, index - k)) return true;
  }
  return false;
}

/** 一段文字裡用到的避免詞，依出現順序、不重複。 */
export function findAvoidedTerms(text: string): string[] {
  const clean = text.replace(EXEMPT_PATTERN, " ");
  const found = [...clean.matchAll(AVOID_PATTERN)]
    .filter((match) => {
      const { except } = AVOID_INDEX.get(match[0])!;
      return !except.some((phrase) =>
        insidePhrase(clean, match.index, match[0], phrase),
      );
    })
    .map((match) => match[0]);
  return [...new Set(found)];
}

/** 檢查單一欄位的文字。 */
export function checkTermsInText(
  owner: TermOwner,
  file: string,
  field: string,
  text: string,
): Issue[] {
  return findAvoidedTerms(text).map((term) => {
    const { use, note } = AVOID_INDEX.get(term)!;
    return {
      ...owner,
      field,
      file,
      message: `用詞「${term}」不是臺灣用語，請改寫作「${use}」。${note ?? ""}`,
    };
  });
}

/**
 * 遞迴檢查資料裡所有文字欄位（含圖片替代文字）。
 * `skipFields` 以欄位路徑（例如 `references.0.title`）比對，放不屬於本站撰文的欄位。
 */
export function checkTerms(
  owner: TermOwner,
  file: string,
  value: unknown,
  skipFields?: RegExp,
  path = "",
): Issue[] {
  if (skipFields?.test(path)) return [];
  if (typeof value === "string") {
    return checkTermsInText(owner, file, path || "(root)", value);
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, i) =>
      checkTerms(owner, file, item, skipFields, path ? `${path}.${i}` : `${i}`),
    );
  }
  if (typeof value === "object" && value !== null && !(value instanceof Date)) {
    return Object.entries(value).flatMap(([key, item]) =>
      NON_TEXT_KEYS.has(key)
        ? []
        : checkTerms(
            owner,
            file,
            item,
            skipFields,
            path ? `${path}.${key}` : key,
          ),
    );
  }
  return [];
}
