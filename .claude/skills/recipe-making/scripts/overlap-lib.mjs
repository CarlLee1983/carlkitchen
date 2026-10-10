// 照抄檢查的純函式：文字抽取與片段比對，供 overlap.mjs 與 scripts/check-overlap.mjs 共用。
import { readFileSync } from "node:fs";
import { parse } from "yaml";

export const normalize = (text) =>
  text.replace(/[\s\p{P}\p{S}]/gu, "").normalize("NFKC");

export function htmlSourceText(html) {
  // JSON-LD 內常有完整材料與步驟，先保留它的字串內容，再拿掉其他 script 與標籤
  const jsonLd = [
    ...html.matchAll(/<script[^>]*ld\+json[^>]*>([\s\S]*?)<\/script>/gi),
  ]
    .map((match) => match[1])
    .join(" ");
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ");
  return normalize(`${jsonLd} ${body}`);
}

// 菜譜的可比對欄位：[欄位名, 文字]
export function recipeFields(recipe) {
  const fields = [];
  if (recipe.summary) fields.push(["summary", recipe.summary]);
  (recipe.steps ?? []).forEach((step, index) =>
    fields.push([`steps.${index + 1}`, step.text ?? ""]),
  );
  (recipe.ingredients ?? []).forEach((item) => {
    if (item.note) fields.push([`ingredients.${item.name}.note`, item.note]);
  });
  (recipe.tips ?? []).forEach((tip, index) =>
    fields.push([
      `tips.${index + 1}`,
      typeof tip === "string" ? tip : (tip.text ?? ""),
    ]),
  );
  return fields;
}

// 拆出專題的 frontmatter 與正文
function splitTopic(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: markdown };
  return { frontmatter: parse(match[1]) ?? {}, body: match[2] };
}

// 專題的可比對欄位：summary 與正文每個段落（去標題行、圖片語法，連結只留文字）
export function topicFields(markdown) {
  const { frontmatter, body } = splitTopic(markdown);
  const fields = [];
  if (frontmatter.summary) fields.push(["summary", frontmatter.summary]);
  let index = 0;
  for (const block of body.split(/\r?\n\s*\r?\n/)) {
    const text = block
      .split(/\r?\n/)
      .filter((line) => !/^\s*#{1,6}\s/.test(line))
      .join("\n")
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .trim();
    if (!text) continue;
    index += 1;
    fields.push([`body.${index}`, text]);
  }
  return fields;
}

// 專題關聯的菜譜識別值：frontmatter relatedRecipes 加正文 /recipes/<id>/ 連結，去重
export function topicRecipeIds(markdown) {
  const { frontmatter, body } = splitTopic(markdown);
  const ids = new Set(frontmatter.relatedRecipes ?? []);
  for (const m of body.matchAll(/\/recipes\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?/g))
    ids.add(m[1]);
  return [...ids];
}

const isYaml = (path) => /\.ya?ml$/i.test(path);

// 第一個參數：recipe.yaml 或 topic.md，回傳可比對欄位
export function loadFields(path) {
  const text = readFileSync(path, "utf8");
  return isYaml(path) ? recipeFields(parse(text)) : topicFields(text);
}

// 第二個參數：.html 或另一份 recipe.yaml，回傳正規化後的來源文字
export function loadSource(path) {
  const text = readFileSync(path, "utf8");
  if (!isYaml(path)) return htmlSourceText(text);
  return normalize(
    recipeFields(parse(text))
      .map(([, value]) => value)
      .join(" "),
  );
}

// 回傳 text 中所有長度 ≥ min、且出現在 source 的最長片段（不重疊）
export function copiedSpans(text, source, min = 12) {
  const spans = [];
  let start = 0;
  while (start + min <= text.length) {
    let length = min;
    if (!source.includes(text.slice(start, start + length))) {
      start += 1;
      continue;
    }
    while (
      start + length < text.length &&
      source.includes(text.slice(start, start + length + 1))
    ) {
      length += 1;
    }
    spans.push(text.slice(start, start + length));
    start += length;
  }
  return spans;
}

// 比對整份欄位，回傳 [{ field, span }]
export function findOverlaps(fields, source, min = 12) {
  return fields.flatMap(([field, value]) =>
    copiedSpans(normalize(value), source, min).map((span) => ({
      field,
      span,
    })),
  );
}
