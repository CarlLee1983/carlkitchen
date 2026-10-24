import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import playwrightConfig from "../playwright.config.ts";

const root = resolve(import.meta.dirname, "..");
const { scripts } = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8"),
);

// 執行真正的套件腳本，但把最後的 pnpm build 換成環境快照，避免單元測試重建站台。
function buildEnvironment(script: string) {
  const dir = mkdtempSync(join(tmpdir(), "carlkitchen-e2e-output-"));
  try {
    writeFileSync(
      join(dir, "pnpm"),
      `#!${process.execPath}
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
const script = process.argv[2];
if (script === "build") {
  console.log(JSON.stringify(process.env));
} else {
  const { scripts } = JSON.parse(readFileSync("package.json", "utf8"));
  const result = spawnSync("sh", ["-c", scripts[script]], { env: process.env, stdio: "inherit" });
  process.exit(result.status ?? 1);
}
`,
      { mode: 0o755 },
    );
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      PATH: `${dir}:${process.env.PATH}`,
    };
    delete env.ASTRO_OUT_DIR;
    delete env.HOME_BATCH_SIZE;
    const result = spawnSync("sh", ["-c", scripts[script]], {
      cwd: root,
      env,
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("預設 e2e 建置與預覽使用獨立輸出，不覆寫正式 dist", () => {
  const env = buildEnvironment("build:e2e");
  assert.equal(env.ASTRO_OUT_DIR, "dist-e2e");
  assert.equal(env.RECIPES_DIR, "tests/fixtures/recipes");
  assert.equal(env.INGREDIENTS_DIR, "tests/fixtures/ingredients");
  assert.equal(env.TOPICS_DIR, "tests/fixtures/topics");
  assert.equal(env.SOLAR_TERMS_DIR, "tests/fixtures/solar-terms");
  assert.equal(env.INGREDIENT_SOURCES_DIR, "tests/fixtures/ingredient-sources");
  assert.equal(env.HOME_BATCH_SIZE, undefined);
  const webServer = playwrightConfig.webServer;
  assert(webServer && !Array.isArray(webServer));
  assert.equal(webServer.env?.ASTRO_OUT_DIR, "dist-e2e");
});

test("顯示更多 e2e 保留獨立輸出及每批一道的固定菜譜設定", () => {
  const env = buildEnvironment("build:e2e-show-more");
  assert.equal(env.ASTRO_OUT_DIR, "dist-show-more");
  assert.equal(env.HOME_BATCH_SIZE, "1");
  assert.equal(env.RECIPES_DIR, "tests/fixtures/recipes");
});

test("重跑檢查時不把 e2e 產物當成程式來源", () => {
  const config = JSON.parse(readFileSync(join(root, "tsconfig.json"), "utf8"));
  const prettierIgnore = readFileSync(
    join(root, ".prettierignore"),
    "utf8",
  ).split("\n");
  for (const output of ["dist-e2e", "dist-meal", "dist-show-more"]) {
    assert.ok(config.exclude.includes(output), `型別檢查未排除 ${output}`);
    assert.ok(prettierIgnore.includes(output), `格式檢查未排除 ${output}`);
  }
});
