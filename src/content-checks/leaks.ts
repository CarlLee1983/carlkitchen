import type { Issue } from "./issue.ts";

export interface BuildFile {
  /** 相對於建置輸出目錄的路徑，以 `/` 分隔。 */
  path: string;
  text: string;
}

const escapeRegExp = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  sol: "/",
};

/** 連續的 `%XX` 一起解碼；解不開（例如不合法的 UTF-8）就保留原文。 */
function decodePercent(text: string): string {
  return text.replace(/(?:%[0-9a-fA-F]{2})+/g, (run) => {
    try {
      return decodeURIComponent(run);
    } catch {
      return run;
    }
  });
}

/**
 * 把檔案文字還原成可比對的形式：解 JSON 跳脫（`\/`、`\uXXXX`）、HTML 實體、
 * 百分比編碼，再轉小寫。順序固定為由外層（JSON）到內層（URL）。
 */
export function normalizeText(text: string): string {
  const unescaped = text
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex: string) =>
      String.fromCharCode(Number.parseInt(hex, 16)),
    )
    .replaceAll("\\/", "/");
  const decoded = unescaped.replace(
    /&(?:#(\d+)|#[xX]([0-9a-fA-F]+)|([a-zA-Z]+));/g,
    (whole, dec?: string, hex?: string, name?: string) => {
      if (name) return NAMED_ENTITIES[name] ?? whole;
      const code = Number.parseInt(dec ?? hex!, dec ? 10 : 16);
      return code <= 0x10ffff ? String.fromCodePoint(code) : whole;
    },
  );
  return decodePercent(decoded).toLowerCase();
}

/**
 * 來源網址的比對核心：主機（去 `www.`）加路徑（去結尾斜線），皆轉小寫；
 * scheme、port、query、fragment 不參與。路徑為 `/` 時只剩主機，
 * 屬保守比對：來源指向某站首頁時，輸出出現該主機就視為外洩。
 */
export function sourceCore(url: string): string {
  const { hostname, pathname } = new URL(url);
  const host = hostname.replace(/^www\./i, "");
  return `${host}${decodePercent(pathname).replace(/\/+$/, "")}`.toLowerCase();
}

/**
 * 建置輸出不得含草稿頁面、草稿頁面連結，也不得含任何內部來源網址。
 * 草稿以 `recipes/<識別值>` 判斷（識別值格式由 run.ts 限制為小寫 kebab），
 * 前後邊界不是 slug 字元，避免 `tea` 命中 `tea-egg`，也不會因內文出現英文單字誤報。
 */
export function checkLeaks(input: {
  files: readonly BuildFile[];
  draftIds: readonly string[];
  draftIngredientIds?: readonly string[];
  draftTopicIds?: readonly string[];
  sourceUrls: readonly string[];
}): Issue[] {
  const draftPatterns = [
    ...input.draftIds.map((id) => ({
      id,
      kind: "recipe" as const,
      base: "recipes",
    })),
    ...(input.draftIngredientIds ?? []).map((id) => ({
      id,
      kind: "ingredient" as const,
      base: "ingredients",
    })),
    ...(input.draftTopicIds ?? []).map((id) => ({
      id,
      kind: "topic" as const,
      base: "topics",
    })),
  ].map(({ id, kind, base }) => ({
    id,
    kind,
    pattern: new RegExp(
      `(?<![a-z0-9-])${base}/${escapeRegExp(id)}(?![a-z0-9-])`,
    ),
  }));
  const cores = input.sourceUrls.map((url) => ({
    url,
    core: sourceCore(url),
  }));
  const issues: Issue[] = [];

  for (const file of input.files) {
    const path = file.path.toLowerCase();
    const text = normalizeText(file.text);
    for (const { id, kind, pattern } of draftPatterns) {
      if (pattern.test(path)) {
        issues.push({
          [kind]: id,
          file: file.path,
          message: "建置輸出含草稿頁面或檔案。",
        });
      } else if (pattern.test(text)) {
        issues.push({
          [kind]: id,
          file: file.path,
          message: "建置輸出內容含草稿頁面連結。",
        });
      }
    }
    for (const { url, core } of cores) {
      if (text.includes(core)) {
        issues.push({
          file: file.path,
          message: `建置輸出含內部來源網址 ${url}。`,
        });
      }
    }
  }
  return issues;
}
