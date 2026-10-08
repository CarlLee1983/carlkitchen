import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import { checkSolarTerms } from "../src/content-checks/solar-terms.ts";
import { checkCopy } from "../src/content-checks/copy.ts";
import { checkLeaks } from "../src/content-checks/leaks.ts";
import { solarTermArt } from "../src/utils/solar-terms.ts";

const workDirs: string[] = [];
// draft-ingredient 這類草稿不在已發布清單裡
const publicIngredientIds = ["cabbage", "tomato"];

const term = (name: string, ingredients: string[]) => `name: ${name}
description: 固定資料的${name}說明。
seasonalIngredients: [${ingredients.join(", ")}]
`;

const SOURCE_URL = "https://example.com/solar-term-approved";

/** 一份完整涵蓋指定節氣的來源紀錄。 */
const sourceRecord = (
  ids: string[],
  urls: string[] = [SOURCE_URL],
  sources: string[] = [SOURCE_URL],
) => `sources:
${sources.map((url) => `  - title: 測試核准來源\n    url: ${url}`).join("\n")}
terms:${ids.length === 0 ? " []" : ""}
${ids.map((id) => `  - id: ${id}\n    urls:\n${urls.map((url) => `      - ${url}`).join("\n")}`).join("\n")}
`;

const allIds = Object.values(solarTermArt);
const allTerms = () =>
  Object.fromEntries(
    Object.entries(solarTermArt).map(([name, id]) => [id, term(name, [])]),
  );

/** 節氣目錄與來源紀錄目錄：預設來源紀錄涵蓋傳入的所有節氣。 */
function scenario(
  terms: Record<string, string>,
  sources: Record<string, string> = {
    "solar-terms.yaml": sourceRecord(
      Object.keys(terms).filter((id) => allIds.includes(id as never)),
    ),
  },
) {
  const root = mkdtempSync(join(tmpdir(), "solar-term-checks-"));
  workDirs.push(root);
  const solarTermsDir = join(root, "solar-terms");
  const solarTermSourcesDir = join(root, "solar-term-sources");
  mkdirSync(solarTermsDir);
  mkdirSync(solarTermSourcesDir);
  for (const [id, content] of Object.entries(terms)) {
    const name = id.includes(".") ? id : `${id}.yaml`;
    writeFileSync(join(solarTermsDir, name), content);
  }
  for (const [name, content] of Object.entries(sources)) {
    writeFileSync(join(solarTermSourcesDir, name), content);
  }
  return { solarTermsDir, solarTermSourcesDir };
}

const check = (dirs: ReturnType<typeof scenario>) =>
  checkSolarTerms({ ...dirs, publicIngredientIds });
const run = (dirs: ReturnType<typeof scenario>) => check(dirs).issues;

after(() => {
  for (const dir of workDirs) rmSync(dir, { recursive: true, force: true });
});

/** 24 筆齊全的節氣，個別檔案可覆寫。 */
const full = (overrides: Record<string, string> = {}) => ({
  ...allTerms(),
  ...overrides,
});

describe("節氣檢查：齊全與 schema", () => {
  it("空目錄通過，來源紀錄目錄為空也通過", () => {
    assert.deepEqual(run(scenario({}, {})), []);
  });

  it("24 筆齊全且有來源對照時通過", () => {
    assert.deepEqual(run(scenario(full())), []);
  });

  it("缺節氣時逐一回報缺少的識別值", () => {
    const terms = full();
    delete terms.lichun;
    delete terms.dongzhi;
    const issues = run(scenario(terms));
    assert.equal(issues.length, 2);
    assert.match(issues[0]!.message, /lichun/);
    assert.match(issues[1]!.message, /dongzhi/);
  });

  it("多出未知識別值時回報檔名", () => {
    const dirs = scenario(full({ "extra-term": term("多餘", []) }));
    const issues = run(dirs);
    assert.equal(issues.length, 1);
    assert.equal(issues[0]!.solarTerm, "extra-term");
    assert.match(issues[0]!.file!, /extra-term\.yaml$/);
  });

  it("節氣目錄裡的非 yaml 檔回報，.gitkeep 不算", () => {
    const dirs = scenario(full({ "lichun.yml": "x", ".gitkeep": "" }));
    const issues = run(dirs);
    assert.equal(issues.length, 1);
    assert.match(issues[0]!.file!, /lichun\.yml$/);
  });

  it("schema 錯誤回報節氣、欄位與檔案，不再略過", () => {
    const dirs = scenario(full({ lichun: "name: 立春\n" }));
    const issues = run(dirs);
    assert.ok(issues.length >= 2);
    assert.ok(issues.every((issue) => issue.solarTerm === "lichun"));
    assert.ok(issues.some((issue) => issue.field === "description"));
    assert.match(issues[0]!.file!, /lichun\.yaml$/);
  });

  it("名稱與識別值不符時回報節氣與名稱欄位", () => {
    const issues = run(scenario(full({ lichun: term("雨水", []) })));
    assert.equal(issues.length, 1);
    assert.equal(issues[0]!.solarTerm, "lichun");
    assert.equal(issues[0]!.field, "name");
    assert.match(issues[0]!.message, /立春/);
  });

  it("YAML 無法解析時回報，不中斷其他節氣", () => {
    const dirs = scenario(full({ lichun: "name: [壞掉\n", yushui: "x: 1\n" }));
    const issues = run(dirs);
    assert.ok(issues.some((i) => i.solarTerm === "lichun"));
    assert.ok(issues.some((i) => i.solarTerm === "yushui"));
  });
});

describe("節氣檢查：當令食材連結", () => {
  it("當令食材只指向已發布食材條目時通過，空陣列也通過", () => {
    const dir = scenario(
      full({
        lichun: term("立春", ["cabbage", "tomato"]),
        yushui: term("雨水", []),
      }),
    );
    assert.deepEqual(run(dir), []);
  });

  it("指向不存在的食材條目時回報節氣、欄位與識別值", () => {
    const dir = scenario(
      full({ lichun: term("立春", ["cabbage", "no-such"]) }),
    );
    const issues = run(dir);
    assert.equal(issues.length, 1);
    assert.equal(issues[0]!.solarTerm, "lichun");
    assert.equal(issues[0]!.field, "seasonalIngredients.1");
    assert.match(issues[0]!.file!, /lichun\.yaml$/);
    assert.match(issues[0]!.message, /no-such/);
  });

  it("指向未發布（草稿）的食材條目時同樣回報", () => {
    const dir = scenario(full({ dongzhi: term("冬至", ["draft-ingredient"]) }));
    const issues = run(dir);
    assert.equal(issues.length, 1);
    assert.match(issues[0]!.message, /draft-ingredient/);
  });

  it("每個壞連結各回報一項", () => {
    const dir = scenario(
      full({
        lichun: term("立春", ["a-missing"]),
        dongzhi: term("冬至", ["b-missing", "c-missing"]),
      }),
    );
    assert.equal(run(dir).length, 3);
  });

  it("找不到節氣目錄時回報", () => {
    const dirs = scenario({});
    const issues = run({
      ...dirs,
      solarTermsDir: join(tmpdir(), "solar-terms-does-not-exist"),
    });
    assert.equal(issues.length, 1);
    assert.match(issues[0]!.message, /SOLAR_TERMS_DIR/);
  });
});

describe("節氣檢查：來源紀錄", () => {
  it("有節氣資料卻沒有來源紀錄時回報", () => {
    const issues = run(scenario(full(), {}));
    assert.equal(issues.length, 1);
    assert.match(issues[0]!.file!, /solar-terms\.yaml$/);
    assert.match(issues[0]!.message, /來源紀錄/);
  });

  it("說明在來源紀錄沒有對照時回報該節氣", () => {
    const ids = allIds.filter((id) => id !== "hanlu");
    const issues = run(
      scenario(full(), { "solar-terms.yaml": sourceRecord(ids) }),
    );
    assert.equal(issues.length, 1);
    assert.equal(issues[0]!.solarTerm, "hanlu");
    assert.equal(issues[0]!.field, "terms");
  });

  it("對照網址沒有列在 sources 時回報", () => {
    const record = sourceRecord(
      allIds,
      ["https://example.com/not-listed"],
      [SOURCE_URL],
    );
    const issues = run(scenario(full(), { "solar-terms.yaml": record }));
    assert.equal(issues.length, allIds.length);
    assert.match(issues[0]!.message, /not-listed/);
    assert.match(issues[0]!.message, /sources/);
  });

  it("對照的識別值不是 24 個節氣之一，或重複列出時回報", () => {
    const unknown = run(
      scenario(full(), {
        "solar-terms.yaml": sourceRecord([...allIds, "no-such-term"]),
      }),
    );
    assert.equal(unknown.length, 1);
    assert.match(unknown[0]!.message, /no-such-term|節氣/);
    const duplicate = run(
      scenario(full(), {
        "solar-terms.yaml": sourceRecord([...allIds, "lichun"]),
      }),
    );
    assert.equal(duplicate.length, 1);
    assert.match(duplicate[0]!.message, /lichun/);
  });

  it("來源紀錄格式錯誤時回報，YAML 無法解析也回報", () => {
    const bad = run(scenario(full(), { "solar-terms.yaml": "sources: []\n" }));
    assert.ok(bad.length > 0);
    const broken = run(
      scenario(full(), { "solar-terms.yaml": "sources: [壞\n" }),
    );
    assert.equal(broken.length, 1);
    assert.match(broken[0]!.file!, /solar-terms\.yaml$/);
  });

  it("sources 為空時回報至少需要一筆核准來源", () => {
    const record = `sources: []\nterms:\n${allIds.map((id) => `  - id: ${id}\n    urls: []\n`).join("")}`;
    const issues = run(scenario(full(), { "solar-terms.yaml": record }));
    assert.ok(issues.length > 0);
  });

  it("不明來源檔回報，.gitkeep 不算", () => {
    const dirs = scenario(full(), {
      "solar-terms.yaml": sourceRecord(allIds),
      "notes.txt": "x",
      "other.yaml": sourceRecord(allIds),
      ".gitkeep": "",
    });
    const files = run(dirs)
      .map((issue) => issue.file?.split("/").pop())
      .sort();
    assert.deepEqual(files, ["notes.txt", "other.yaml"]);
  });

  it("回傳核准來源網址供洩漏掃描", () => {
    const { sourceUrls } = check(scenario(full()));
    assert.deepEqual(sourceUrls, [SOURCE_URL]);
  });

  it("空集合時不要求對照，但仍回傳已有的來源網址", () => {
    const dirs = scenario({}, { "solar-terms.yaml": sourceRecord([]) });
    const result = check(dirs);
    assert.deepEqual(result.issues, []);
    assert.deepEqual(result.sourceUrls, [SOURCE_URL]);
  });
});

describe("節氣頁的建置輸出檢查", () => {
  it("來源網址出現在 /solar-terms/ 輸出時被洩漏檢查擋下", () => {
    const issues = checkLeaks({
      files: [
        {
          path: "solar-terms/index.html",
          text: `<a href="${SOURCE_URL}">出處</a>`,
        },
      ],
      draftIds: [],
      sourceUrls: [SOURCE_URL],
    });
    assert.equal(issues.length, 1);
    assert.equal(issues[0]!.file, "solar-terms/index.html");
  });

  it("總覽頁出現「AI」或「試做」時被文案檢查擋下", () => {
    const issues = checkCopy([
      { path: "solar-terms/index.html", text: "<p>由 AI 整理，未經試做。</p>" },
    ]);
    assert.equal(issues.length, 2);
    assert.ok(issues.every((i) => i.file === "solar-terms/index.html"));
  });
});
