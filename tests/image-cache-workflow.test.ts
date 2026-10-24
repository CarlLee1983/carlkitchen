import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parse } from "yaml";

const action = parse(
  readFileSync(
    new URL("../.github/actions/verify/action.yml", import.meta.url),
    "utf8",
  ),
);

test("圖片快取只保存 Astro 圖片，不保存內容層或正式輸出", () => {
  const steps = action.runs.steps;
  const cache = steps.find((step: { uses?: string }) =>
    step.uses?.startsWith("actions/cache@"),
  );
  assert.ok(cache, "共用驗證必須還原圖片快取");
  assert.match(cache.uses, /^actions\/cache@[a-f0-9]{40}$/);
  assert.equal(cache.with.path, "node_modules/.astro/assets");
  assert.ok(
    steps.indexOf(cache) >
      steps.findIndex(
        (step: { name: string }) => step.name === "Install dependencies",
      ),
  );
  assert.ok(
    steps.indexOf(cache) <
      steps.findIndex((step: { run?: string }) => step.run === "pnpm check"),
  );
});

test("還原快取不能跨過作業系統、工具鏈、依賴或圖片服務設定邊界", () => {
  const cache = action.runs.steps.find((step: { uses?: string }) =>
    step.uses?.startsWith("actions/cache@"),
  );
  assert.ok(cache);
  const prefix = cache.with["restore-keys"].trim();
  assert.equal(prefix.split("\n").length, 1, "不允許放寬邊界的備用前綴");
  for (const boundary of [
    "runner.os",
    "runner.arch",
    "steps.image-cache-toolchain.outputs.versions",
    "pnpm-lock.yaml",
    "package.json",
    "astro.config.mjs",
  ]) {
    assert.ok(prefix.includes(boundary), `快取邊界缺少 ${boundary}`);
  }
  assert.equal(cache.with.key, `${prefix}${"${{ github.sha }}"}`);
});
