import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { runContentChecks } from "../src/content-checks/run.ts";

const fixtures = fileURLToPath(
  new URL("./fixtures/content-checks", import.meta.url),
);
const cli = fileURLToPath(
  new URL("../scripts/check-content.ts", import.meta.url),
);
const workDirs: string[] = [];

/** 把通過情境複製到暫存目錄，讓每個測試各自改壞一處。 */
function scenario() {
  const root = mkdtempSync(join(tmpdir(), "content-checks-"));
  workDirs.push(root);
  cpSync(join(fixtures, "valid"), root, { recursive: true });
  mkdirSync(join(root, "ingredients"));
  mkdirSync(join(root, "ingredient-sources"));
  return {
    root,
    options: {
      recipesDir: join(root, "recipes"),
      sourcesDir: join(root, "sources"),
      distDir: join(root, "dist"),
      launch: false,
    },
    write(path: string, content: string | Buffer) {
      mkdirSync(join(path, ".."), { recursive: true });
      writeFileSync(path, content);
    },
  };
}

after(() => {
  for (const dir of workDirs) rmSync(dir, { recursive: true, force: true });
});

describe("runContentChecks", () => {
  it("通過情境沒有問題", async () => {
    assert.deepEqual(await runContentChecks(scenario().options), []);
  });

  it("空的菜譜與來源目錄也通過", async () => {
    const s = scenario();
    for (const dir of ["recipes", "sources", "dist"]) {
      rmSync(join(s.root, dir), { recursive: true });
      mkdirSync(join(s.root, dir));
    }
    assert.deepEqual(await runContentChecks(s.options), []);
  });

  it("重複使用同一楊桃食譜頁時指出兩張菜譜", async () => {
    const s = scenario();
    cpSync(join(s.root, "recipes/alpha"), join(s.root, "recipes/beta"), {
      recursive: true,
    });
    s.write(
      join(s.root, "sources/alpha.yaml"),
      "urls:\n  - https://www.ytower.com.tw/recipe/iframe-recipe.asp?seq=A01-0001\n",
    );
    s.write(
      join(s.root, "sources/beta.yaml"),
      "urls:\n  - https://www.ytower.com.tw/recipe/iframe-recipe.asp?seq=A01-0001\n",
    );
    const issues = await runContentChecks(s.options);
    const duplicateIssues = issues.filter((issue) =>
      /楊桃食譜來源與/.test(issue.message),
    );
    assert.deepEqual(duplicateIssues.map((issue) => issue.recipe).sort(), [
      "alpha",
      "beta",
    ]);
  });

  it("YAML 無法解析的菜譜不會讓它的來源被多報成孤兒", async () => {
    const s = scenario();
    s.write(join(s.root, "recipes/alpha/recipe.yaml"), "title: [壞掉\n");
    const issues = await runContentChecks(s.options);
    assert.equal(issues.length, 1);
    assert.equal(issues[0]?.recipe, "alpha");
  });

  it("schema 失敗時註明圖片尚未檢查", async () => {
    const s = scenario();
    s.write(join(s.root, "recipes/alpha/recipe.yaml"), "title: x\n");
    const issues = await runContentChecks(s.options);
    assert.ok(issues.every((issue) => /圖片/.test(issue.message)));
  });

  it("菜譜資料夾名稱不是小寫 kebab-case", async () => {
    const s = scenario();
    cpSync(join(s.root, "recipes/alpha"), join(s.root, "recipes/Bad_Id"), {
      recursive: true,
    });
    cpSync(
      join(s.root, "sources/alpha.yaml"),
      join(s.root, "sources/Bad_Id.yaml"),
    );
    const issues = await runContentChecks(s.options);
    assert.equal(issues.length, 1);
    assert.equal(issues[0]?.recipe, "Bad_Id");
    assert.match(issues[0]!.file!, /Bad_Id$/);
  });

  it("來源目錄中無法辨識的檔案", async () => {
    const s = scenario();
    s.write(join(s.root, "sources/notes.txt"), "x");
    s.write(join(s.root, "sources/beta.yml"), "x");
    s.write(join(s.root, "sources/.gitkeep"), "");
    const issues = await runContentChecks(s.options);
    assert.deepEqual(
      issues.map((issue) => issue.file?.split("/").pop()).sort(),
      ["beta.yml", "notes.txt"],
    );
  });

  it("草稿的圖片不檢查（草稿引用不存在的圖也通過）", async () => {
    const s = scenario();
    const draft = readFileSync(
      join(s.root, "recipes/beta-draft/recipe.yaml"),
      "utf8",
    );
    assert.match(draft, /missing\.webp/);
    assert.deepEqual(await runContentChecks(s.options), []);
  });

  it("公開菜譜缺來源紀錄", async () => {
    const s = scenario();
    rmSync(join(s.root, "sources/alpha.yaml"));
    const issues = await runContentChecks(s.options);
    assert.deepEqual(
      issues.map((issue) => issue.recipe),
      ["alpha"],
    );
  });

  it("孤兒來源紀錄", async () => {
    const s = scenario();
    s.write(
      join(s.root, "sources/ghost.yaml"),
      "urls: [https://example.com/g]\n",
    );
    const issues = await runContentChecks(s.options);
    assert.equal(issues.length, 1);
    assert.match(issues[0]!.file!, /ghost\.yaml$/);
  });

  it("來源紀錄格式錯誤", async () => {
    const s = scenario();
    s.write(join(s.root, "sources/alpha.yaml"), "urls: []\n");
    const issues = await runContentChecks(s.options);
    assert.equal(issues.length, 1);
    assert.match(issues[0]!.file!, /alpha\.yaml$/);
  });

  it("菜譜 schema 錯誤", async () => {
    const s = scenario();
    s.write(join(s.root, "recipes/alpha/recipe.yaml"), "title: x\n");
    const issues = await runContentChecks(s.options);
    assert.ok(
      issues.some(
        (issue) => issue.recipe === "alpha" && issue.field === "summary",
      ),
    );
  });

  it("圖片檔不存在", async () => {
    const s = scenario();
    rmSync(join(s.root, "recipes/alpha/hero.webp"));
    const issues = await runContentChecks(s.options);
    assert.deepEqual(
      issues.map((issue) => [issue.recipe, issue.field]),
      [["alpha", "hero"]],
    );
  });

  it("圖片不是 WebP", async () => {
    const s = scenario();
    cpSync(
      join(fixtures, "images/not-webp.png"),
      join(s.root, "recipes/alpha/hero.webp"),
    );
    const issues = await runContentChecks(s.options);
    assert.equal(issues.length, 1);
    assert.match(issues[0]!.message, /WebP/);
  });

  it("圖片尺寸不對", async () => {
    const s = scenario();
    cpSync(
      join(fixtures, "images/small.webp"),
      join(s.root, "recipes/alpha/step-1.webp"),
    );
    const issues = await runContentChecks(s.options);
    assert.equal(issues.length, 1);
    assert.equal(issues[0]?.field, "steps.0.image");
  });

  it("草稿識別值出現在建置輸出", async () => {
    const s = scenario();
    s.write(
      join(s.root, "dist/recipes/beta-draft/index.html"),
      "<h1>草稿菜</h1>",
    );
    const issues = await runContentChecks(s.options);
    assert.ok(issues.every((issue) => issue.recipe === "beta-draft"));
    assert.ok(issues.length >= 1);
  });

  it("來源網址出現在建置輸出，包含草稿菜譜的來源", async () => {
    const s = scenario();
    s.write(
      join(s.root, "dist/recipes/alpha/index.html"),
      '<a href="https://example.com/source/beta">來源</a>',
    );
    const issues = await runContentChecks(s.options);
    assert.equal(issues.length, 1);
    assert.match(issues[0]!.file!, /recipes\/alpha\/index\.html$/);
  });

  it("建置輸出的頁面文案提到 AI 或試做", async () => {
    const s = scenario();
    s.write(
      join(s.root, "dist/recipes/alpha/index.html"),
      "<p>依公開資料由 AI 整理，未經試做</p>",
    );
    const issues = await runContentChecks(s.options);
    assert.equal(issues.length, 2);
    assert.ok(
      issues.every((issue) => /recipes\/alpha\/index\.html$/.test(issue.file!)),
    );
  });

  it("找不到建置輸出目錄", async () => {
    const s = scenario();
    rmSync(join(s.root, "dist"), { recursive: true });
    const issues = await runContentChecks(s.options);
    assert.equal(issues.length, 1);
    assert.match(issues[0]!.file!, /dist$/);
  });

  it("找不到菜譜目錄", async () => {
    const s = scenario();
    rmSync(join(s.root, "recipes"), { recursive: true });
    const issues = await runContentChecks(s.options);
    assert.equal(issues.length, 1);
    assert.match(issues[0]!.file!, /recipes$/);
  });

  it("節氣的當令食材指向不存在的食材條目時回報；空的節氣目錄通過", async () => {
    const s = scenario();
    const solarTermsDir = join(s.root, "solar-terms");
    const solarTermSourcesDir = join(s.root, "solar-term-sources");
    mkdirSync(solarTermsDir);
    mkdirSync(solarTermSourcesDir);
    const options = {
      ...s.options,
      ingredientsDir: join(s.root, "ingredients"),
      solarTermsDir,
      solarTermSourcesDir,
    };
    assert.deepEqual(await runContentChecks(options), []);
    s.write(
      join(solarTermsDir, "lichun.yaml"),
      "name: 立春\ndescription: 說明。\nseasonalIngredients: [no-such]\n",
    );
    const issues = await runContentChecks(options);
    // 缺的 23 個節氣一併回報，當令食材問題在其中
    assert.ok(issues.some((issue) => issue.field === "seasonalIngredients.0"));
    assert.ok(issues.some((issue) => /缺少節氣/.test(issue.message)));
  });

  it("節氣來源網址出現在建置輸出時被洩漏檢查擋下", async () => {
    const s = scenario();
    const solarTermsDir = join(s.root, "solar-terms");
    const solarTermSourcesDir = join(s.root, "solar-term-sources");
    cpSync(
      fileURLToPath(new URL("./fixtures/solar-terms", import.meta.url)),
      solarTermsDir,
      { recursive: true },
    );
    cpSync(
      fileURLToPath(new URL("./fixtures/solar-term-sources", import.meta.url)),
      solarTermSourcesDir,
      { recursive: true },
    );
    // 固定節氣的當令食材指向固定食材條目；這裡只測來源洩漏，清空當令食材
    for (const file of readdirSync(solarTermsDir)) {
      const path = join(solarTermsDir, file);
      const text = readFileSync(path, "utf8");
      s.write(
        path,
        text.replace(
          /seasonalIngredients:[\s\S]*$/,
          "seasonalIngredients: []\n",
        ),
      );
    }
    const options = {
      ...s.options,
      ingredientsDir: join(s.root, "ingredients"),
      solarTermsDir,
      solarTermSourcesDir,
    };
    assert.deepEqual(await runContentChecks(options), []);
    s.write(
      join(s.root, "dist/solar-terms/index.html"),
      '<a href="https://example.com/solar-term-approved">出處</a>',
    );
    const issues = await runContentChecks(options);
    assert.equal(issues.length, 1);
    assert.match(issues[0]!.file!, /solar-terms\/index\.html$/);
  });

  it("solarTermsDir 與 solarTermSourcesDir 只給一個時回報設定不完整", async () => {
    const s = scenario();
    const solarTermsDir = join(s.root, "solar-terms");
    mkdirSync(solarTermsDir);
    const issues = await runContentChecks({ ...s.options, solarTermsDir });
    assert.equal(issues.length, 1);
    assert.match(issues[0]!.message, /設定不完整/);
  });

  it("門檻模式列出缺額，預設模式不檢查", async () => {
    const s = scenario();
    assert.deepEqual(await runContentChecks(s.options), []);
    const issues = await runContentChecks({ ...s.options, launch: true });
    assert.equal(issues.length, 2);
  });
});

describe("check-content 指令", () => {
  // 專題目錄指向情境內的空目錄，避免讀到正式內容的已發布專題
  const run = (s: ReturnType<typeof scenario>, args: string[] = []) => {
    const topicsDir = join(s.root, "topics");
    const topicSourcesDir = join(s.root, "topic-sources");
    mkdirSync(topicsDir, { recursive: true });
    mkdirSync(topicSourcesDir, { recursive: true });
    const solarTermsDir = join(s.root, "solar-terms");
    mkdirSync(solarTermsDir, { recursive: true });
    const solarTermSourcesDir = join(s.root, "solar-term-sources");
    mkdirSync(solarTermSourcesDir, { recursive: true });
    return spawnSync(
      process.execPath,
      ["--experimental-strip-types", cli, "--dist", s.options.distDir, ...args],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          RECIPES_DIR: s.options.recipesDir,
          SOURCES_DIR: s.options.sourcesDir,
          INGREDIENTS_DIR: join(s.root, "ingredients"),
          INGREDIENT_SOURCES_DIR: join(s.root, "ingredient-sources"),
          TOPICS_DIR: topicsDir,
          TOPIC_SOURCES_DIR: topicSourcesDir,
          SOLAR_TERMS_DIR: solarTermsDir,
          SOLAR_TERM_SOURCES_DIR: solarTermSourcesDir,
        },
      },
    );
  };

  it("通過時結束碼 0", () => {
    assert.equal(run(scenario()).status, 0);
  });

  it("失敗時結束碼非 0 並逐項列出問題", () => {
    const s = scenario();
    rmSync(join(s.root, "sources/alpha.yaml"));
    const result = run(s);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /alpha/);
  });

  it("--launch 開啟候選池門檻", () => {
    const s = scenario();
    assert.equal(run(s).status, 0);
    assert.notEqual(run(s, ["--launch"]).status, 0);
  });
});
