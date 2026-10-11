import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { test } from "node:test";
import sharp from "sharp";
import { parse } from "yaml";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url));
const digest = (bytes: Buffer) =>
  createHash("sha256").update(bytes).digest("hex");
const batch = JSON.parse(
  (await read(".scratch/share-print-images/batch-15.json")).toString(),
) as Array<{
  id: string;
  status: string;
  sourceSha256: string;
  sourceRecordSha256: string;
  heroSha256: string;
  webpSha256: string;
  currentAttempts: number;
  historicalAttempts: string;
  sourceRecipeFullTextRead: boolean;
}>;
const preflight = JSON.parse(
  (await read(".scratch/share-print-images/preflight-15.json")).toString(),
) as {
  eligibleCount: number;
  recipes: Array<{
    id: string;
    eligible: boolean;
    currentAttempts: number;
    generationAttemptsThisPreflight: number;
  }>;
};
const audit = JSON.parse(
  (await read(".scratch/share-print-images/source-audit-15.json")).toString(),
) as {
  recipes: Array<{
    id: string;
    eligibleForImageGeneration: boolean;
    sourceRecipeFullTextRead: boolean;
    recipeEditsApplied: boolean;
  }>;
};

test("第十五批只收宮保雞丁首輪一次，來源完整核對與審核通過", () => {
  assert.deepEqual(
    batch.map((entry) => entry.id),
    ["kung-pao-chicken"],
  );
  const entry = batch[0];
  assert.ok(entry);
  assert.equal(entry.status, "accepted");
  assert.equal(entry.currentAttempts, 1);
  assert.equal(entry.historicalAttempts, "unknown");
  assert.equal(entry.sourceRecipeFullTextRead, true);
  assert.equal(preflight.eligibleCount, 1);
  assert.deepEqual(
    preflight.recipes
      .filter((entry) => entry.eligible)
      .map((entry) => entry.id),
    ["kung-pao-chicken"],
  );
  assert.deepEqual(
    audit.recipes
      .filter((entry) => entry.eligibleForImageGeneration)
      .map((entry) => entry.id),
    ["kung-pao-chicken"],
  );
  assert.equal(
    audit.recipes.find((entry) => entry.id === "kung-pao-chicken")
      ?.sourceRecipeFullTextRead,
    true,
  );
  for (const entry of audit.recipes)
    assert.equal(entry.recipeEditsApplied, false);
});

test("宮保雞丁分享圖尺寸、容量、解碼及三份來源雜湊未漂移", async () => {
  const entry = batch[0];
  assert.ok(entry);
  const recipe = await read(`content/recipes/${entry.id}/recipe.yaml`);
  assert.equal(parse(recipe.toString()).draft, false);
  assert.equal(digest(recipe), entry.sourceSha256);
  assert.equal(
    digest(await read(`content/sources/${entry.id}.yaml`)),
    entry.sourceRecordSha256,
  );
  assert.equal(
    digest(await read(`content/recipes/${entry.id}/hero.webp`)),
    entry.heroSha256,
  );
  const bytes = await read(`public/prints/${entry.id}.webp`);
  assert.equal(digest(bytes), entry.webpSha256);
  assert.ok(bytes.length <= 300 * 1024);
  const metadata = await sharp(bytes).metadata();
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.width, 864);
  assert.equal(metadata.height, 1152);
  await sharp(bytes).raw().toBuffer();
});

test("同批九道待核菜譜零嘗試且不進公開分享圖", async () => {
  const held = preflight.recipes.filter((entry) => !entry.eligible);
  assert.equal(held.length, 9);
  for (const entry of held) {
    assert.equal(entry.currentAttempts, 0);
    assert.equal(entry.generationAttemptsThisPreflight, 0);
    await assert.rejects(read(`public/prints/${entry.id}.webp`), {
      code: "ENOENT",
    });
  }
});
