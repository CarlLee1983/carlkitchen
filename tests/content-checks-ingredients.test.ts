import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { runContentChecks } from "../src/content-checks/run.ts";

const fixtures = fileURLToPath(
  new URL("./fixtures/content-checks/valid", import.meta.url),
);
const workDirs: string[] = [];
const sourceUrl = "https://fae.moa.gov.tw/map/food_item.php?id=81&type=AS03";
const sourceLink = `<a href="${sourceUrl}">農業部：產地與產期</a>`;
const entry = `title: 高麗菜
summary: 臺灣常見的葉菜。
category: vegetable
draft: false
selection: 看外葉與切口。
preparation: 逐葉洗淨。
storage: 包好後冷藏。
uses: 適合清炒。
season:
  production:
    - area: 平地
      months: 10 月至翌年 5 月
  bestFlavor: 11 月至翌年 4 月
  scope: 臺灣；產地與年度會影響實際月份。
relatedRecipes:
  - alpha
`;

function scenario() {
  const root = mkdtempSync(join(tmpdir(), "ingredient-checks-"));
  workDirs.push(root);
  cpSync(fixtures, root, { recursive: true });
  const paths = {
    ingredient: join(root, "ingredients/cabbage/ingredient.yaml"),
    sources: join(root, "ingredient-sources/cabbage.yaml"),
    page: join(root, "dist/ingredients/cabbage/index.html"),
  };
  const write = (path: string, content: string) => {
    mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(path, content);
  };
  write(paths.ingredient, entry);
  write(
    paths.sources,
    `sources:\n  - title: 農業部：產地與產期\n    url: ${sourceUrl}\n`,
  );
  write(
    paths.page,
    `<article><a href="/recipes/alpha/">菜譜</a><section data-ingredient-sources="cabbage">${sourceLink}</section></article>`,
  );
  return {
    root,
    paths,
    write,
    options: {
      recipesDir: join(root, "recipes"),
      sourcesDir: join(root, "sources"),
      ingredientsDir: join(root, "ingredients"),
      ingredientSourcesDir: join(root, "ingredient-sources"),
      distDir: join(root, "dist"),
      launch: false,
    },
  };
}

after(() => {
  for (const dir of workDirs) rmSync(dir, { recursive: true, force: true });
});

describe("食材內容檢查", () => {
  it("公開條目只在自己的來源區塊顯示精確核准網址", async () => {
    const s = scenario();
    assert.deepEqual(await runContentChecks(s.options), []);
  });

  it("缺必填欄位時指出食材與欄位", async () => {
    const s = scenario();
    s.write(s.paths.ingredient, entry.replace("storage: 包好後冷藏。\n", ""));
    const issues = await runContentChecks(s.options);
    assert.ok(
      issues.some(
        (issue) =>
          issue.file === s.paths.ingredient && issue.field === "storage",
      ),
    );
  });

  it("公開條目缺來源紀錄時阻擋", async () => {
    const s = scenario();
    rmSync(s.paths.sources);
    const issues = await runContentChecks(s.options);
    assert.ok(issues.some((issue) => /來源紀錄/.test(issue.message)));
  });

  it("相關菜譜須已發布且存在", async () => {
    const s = scenario();
    s.write(s.paths.ingredient, entry.replace("- alpha", "- beta-draft"));
    const issues = await runContentChecks(s.options);
    assert.ok(issues.some((issue) => issue.field === "relatedRecipes.0"));
  });

  it("草稿頁面與連結不可出現在正式輸出", async () => {
    const s = scenario();
    s.write(s.paths.ingredient, entry.replace("draft: false", "draft: true"));
    const issues = await runContentChecks(s.options);
    assert.ok(issues.some((issue) => /草稿/.test(issue.message)));
  });

  it("核准來源出現在其他頁面或來源區塊外仍視為洩漏", async () => {
    const s = scenario();
    s.write(join(s.root, "dist/index.html"), `<a href="${sourceUrl}">誤放</a>`);
    const issues = await runContentChecks(s.options);
    assert.ok(
      issues.some(
        (issue) => issue.file === "index.html" && /來源/.test(issue.message),
      ),
    );
  });

  it("草稿條目的來源網址也不可洩漏到正式輸出", async () => {
    const s = scenario();
    s.write(s.paths.ingredient, entry.replace("draft: false", "draft: true"));
    rmSync(s.paths.page);
    s.write(join(s.root, "dist/index.html"), `<a href="${sourceUrl}">誤放</a>`);
    const issues = await runContentChecks(s.options);
    assert.ok(
      issues.some(
        (issue) => issue.file === "index.html" && /來源/.test(issue.message),
      ),
    );
  });

  it("來源區塊多出未核准連結時阻擋", async () => {
    const s = scenario();
    s.write(
      s.paths.page,
      `<section data-ingredient-sources="cabbage">${sourceLink}<a href="https://example.com/unknown">其他</a></section>`,
    );
    const issues = await runContentChecks(s.options);
    assert.ok(
      issues.some(
        (issue) =>
          issue.file === "ingredients/cabbage/index.html" &&
          /來源/.test(issue.message),
      ),
    );
  });

  it("圖片有引用時檢查格式與尺寸", async () => {
    const s = scenario();
    s.write(
      s.paths.ingredient,
      `${entry}hero:\n  src: missing.webp\n  alt: 高麗菜\n`,
    );
    const issues = await runContentChecks(s.options);
    assert.ok(
      issues.some(
        (issue) => issue.field === "hero" && /找不到圖片/.test(issue.message),
      ),
    );
  });
});
