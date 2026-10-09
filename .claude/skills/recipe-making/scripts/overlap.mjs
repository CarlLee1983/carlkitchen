// 照抄檢查：比對菜譜文字與抓下的來源頁，列出連續相同的字串。
//   node overlap.mjs <recipe.yaml> <來源.html> [門檻字數，預設 12]
// 比對範圍是 summary、步驟 text、材料 note 與 tips；比較前去掉空白與標點，
// 所以只換標點不算改寫。超過門檻的段落印出來，有任何一段就以代碼 1 結束。
// 材料名與數字本來就會相同，門檻設成比一般材料名長，避免誤報。
import { readFileSync } from "node:fs";
import { parse } from "yaml";

const [recipePath, sourcePath, minArg] = process.argv.slice(2);
if (!recipePath || !sourcePath) {
  console.error("用法：node overlap.mjs <recipe.yaml> <來源.html> [門檻字數]");
  process.exit(2);
}
const MIN = Number(minArg ?? 12);

const normalize = (text) =>
  text.replace(/[\s\p{P}\p{S}]/gu, "").normalize("NFKC");

function sourceText(html) {
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

function recipeFields(recipe) {
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

// 回傳 text 中所有長度 ≥ MIN、且出現在 source 的最長片段（不重疊）
function copiedSpans(text, source) {
  const spans = [];
  let start = 0;
  while (start + MIN <= text.length) {
    let length = MIN;
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

const recipe = parse(readFileSync(recipePath, "utf8"));
const source = sourceText(readFileSync(sourcePath, "utf8"));
let found = 0;
for (const [field, value] of recipeFields(recipe)) {
  for (const span of copiedSpans(normalize(value), source)) {
    found += 1;
    console.log(`${field}\t${span.length} 字\t${span}`);
  }
}
console.log(
  found === 0
    ? `沒有 ${MIN} 字以上與來源相同的片段。`
    : `共 ${found} 段與來源相同，請改寫。`,
);
process.exit(found === 0 ? 0 : 1);
