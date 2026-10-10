// 照抄檢查：比對菜譜或專題文字與來源（來源頁或另一份菜譜），列出連續相同的字串。
//   node overlap.mjs <recipe.yaml|topic.md> <來源.html|recipe.yaml> [門檻字數，預設 12]
// 菜譜比對 summary、步驟 text、材料 note 與 tips；專題比對 summary 與正文各段落
// （去掉標題行與圖片語法，連結只留文字）。來源是菜譜時取同樣四類欄位。
// 比較前去掉空白與標點，所以只換標點不算改寫。超過門檻的段落印出來，有任何一段就以代碼 1 結束。
// 材料名與數字本來就會相同，門檻設成比一般材料名長，避免誤報。
import { findOverlaps, loadFields, loadSource } from "./overlap-lib.mjs";

const [targetPath, sourcePath, minArg] = process.argv.slice(2);
if (!targetPath || !sourcePath) {
  console.error(
    "用法：node overlap.mjs <recipe.yaml|topic.md> <來源.html|recipe.yaml> [門檻字數]",
  );
  process.exit(2);
}
const MIN = Number(minArg ?? 12);

const hits = findOverlaps(loadFields(targetPath), loadSource(sourcePath), MIN);
for (const { field, span } of hits) {
  console.log(`${field}\t${span.length} 字\t${span}`);
}
console.log(
  hits.length === 0
    ? `沒有 ${MIN} 字以上與來源相同的片段。`
    : `共 ${hits.length} 段與來源相同，請改寫。`,
);
process.exit(hits.length === 0 ? 0 : 1);
