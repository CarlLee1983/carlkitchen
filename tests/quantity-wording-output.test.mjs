// 實際正式建置輸出回歸：pnpm build 後執行 node --test tests/quantity-wording-output.test.mjs。
// 與 fixture e2e 輸出分開，避免把 fixture 建置誤認成真實菜譜驗收。
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

/** @type {{ id: string; name: string; note: string | null }[]} */
const cases = JSON.parse(
  readFileSync(
    new URL("./fixtures/quantity-wording/cases.json", import.meta.url),
    "utf8",
  ),
);
const dist = resolve(process.env.QUANTITY_WORDING_DIST ?? "dist");
const selected = process.env.QUANTITY_WORDING_RECIPES?.split(",");
const ids = [...new Set(cases.map(({ id }) => id))].filter(
  (id) => !selected || selected.includes(id),
);
/** @param {string} html */
const plain = (html) =>
  html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();

describe("真實菜譜的 HTML 與 JSON-LD 不重複適量", () => {
  for (const id of ids) {
    it(id, () => {
      const html = readFileSync(
        resolve(dist, "recipes", id, "index.html"),
        "utf8",
      );
      const json = html.match(
        /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
      );
      const jsonText = json?.[1];
      assert.ok(jsonText, "正式菜譜須有 JSON-LD");
      const data = JSON.parse(jsonText);
      const aside = html.match(
        /<aside\b[^>]*class="ingredients"[^>]*>([\s\S]*?)<\/aside>/,
      );
      const asideHtml = aside?.[1];
      assert.ok(asideHtml, "正式菜譜須有材料區");
      const list = [...asideHtml.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)].map(
        (match) => {
          assert.ok(match[1]);
          return plain(match[1]);
        },
      );
      for (const entry of cases.filter((entry) => entry.id === id)) {
        const expected = `${entry.name} 適量${entry.note ? `（${entry.note}）` : ""}`;
        assert.ok(
          data.recipeIngredient.includes(expected),
          `JSON-LD 應有 ${expected}`,
        );
        assert.ok(
          list.includes(expected),
          `可見材料清單應有 ${expected}；實際：${list.join(" / ")}`,
        );
      }
    });
  }
});
