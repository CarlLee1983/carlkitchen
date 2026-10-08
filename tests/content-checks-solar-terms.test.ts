import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import { checkSolarTerms } from "../src/content-checks/solar-terms.ts";

const workDirs: string[] = [];
// draft-ingredient 這類草稿不在已發布清單裡
const publicIngredientIds = ["cabbage", "tomato"];

const term = (name: string, ingredients: string[]) => `name: ${name}
description: 固定資料的${name}說明。
seasonalIngredients: [${ingredients.join(", ")}]
`;

function scenario(terms: Record<string, string>) {
  const root = mkdtempSync(join(tmpdir(), "solar-term-checks-"));
  workDirs.push(root);
  for (const [id, content] of Object.entries(terms)) {
    writeFileSync(join(root, `${id}.yaml`), content);
  }
  return root;
}

const run = (solarTermsDir: string) =>
  checkSolarTerms({ solarTermsDir, publicIngredientIds });

after(() => {
  for (const dir of workDirs) rmSync(dir, { recursive: true, force: true });
});

describe("節氣檢查：當令食材連結", () => {
  it("空目錄通過", () => {
    assert.deepEqual(run(scenario({})), []);
  });

  it("當令食材只指向已發布食材條目時通過，空陣列也通過", () => {
    const dir = scenario({
      lichun: term("立春", ["cabbage", "tomato"]),
      yushui: term("雨水", []),
    });
    assert.deepEqual(run(dir), []);
  });

  it("指向不存在的食材條目時回報節氣、欄位與識別值", () => {
    const dir = scenario({ lichun: term("立春", ["cabbage", "no-such"]) });
    const issues = run(dir);
    assert.equal(issues.length, 1);
    assert.equal(issues[0]!.solarTerm, "lichun");
    assert.equal(issues[0]!.field, "seasonalIngredients.1");
    assert.match(issues[0]!.file!, /lichun\.yaml$/);
    assert.match(issues[0]!.message, /no-such/);
  });

  it("指向未發布（草稿）的食材條目時同樣回報", () => {
    const dir = scenario({ dongzhi: term("冬至", ["draft-ingredient"]) });
    const issues = run(dir);
    assert.equal(issues.length, 1);
    assert.match(issues[0]!.message, /draft-ingredient/);
  });

  it("每個壞連結各回報一項", () => {
    const dir = scenario({
      lichun: term("立春", ["a-missing"]),
      dongzhi: term("冬至", ["b-missing", "c-missing"]),
    });
    assert.equal(run(dir).length, 3);
  });

  it("找不到節氣目錄時回報", () => {
    const issues = run(join(tmpdir(), "solar-terms-does-not-exist"));
    assert.equal(issues.length, 1);
    assert.match(issues[0]!.message, /SOLAR_TERMS_DIR/);
  });

  it("缺少 seasonalIngredients 的檔案不丟錯（schema 檢查屬後續工單）", () => {
    assert.deepEqual(run(scenario({ lichun: "name: 立春\n" })), []);
  });
});
