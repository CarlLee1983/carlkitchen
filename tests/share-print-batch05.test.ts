import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { test } from "node:test";
import sharp from "sharp";
import { parse } from "yaml";

const batch = JSON.parse(
  await readFile(
    new URL("../.scratch/share-print-images/batch-05.json", import.meta.url),
    "utf8",
  ),
) as Array<{
  id: string;
  status: string;
  historicalAttempts: string;
  currentAttempts: number;
  originalPrompt: null;
  originalSourceSha256: null;
  recoveredOriginalManifest: false;
  validationSourceSha256: string;
  validationText: string | null;
  generatedSha256: string | null;
  webpSha256: string | null;
  webpBytes: number | null;
  webpQuality: number | null;
}>;

const acceptedIds = [
  "sesame-oil-birdsnest-fern",
  "sesame-oil-vermicelli",
  "shrimp-scrambled-eggs",
  "stir-fried-clams-basil",
];

test("第五批恢復紀錄保留未知歷史與原始缺漏，四通過、三拒用、三預審跳過", () => {
  assert.equal(batch.length, 10);
  assert.equal(new Set(batch.map((entry) => entry.id)).size, 10);
  assert.deepEqual(
    batch
      .filter((entry) => entry.status === "accepted")
      .map((entry) => entry.id),
    acceptedIds,
  );
  assert.equal(batch.filter((entry) => entry.status === "rejected").length, 3);
  assert.equal(batch.filter((entry) => entry.status === "skipped").length, 3);
  for (const entry of batch) {
    assert.equal(entry.historicalAttempts, "unknown");
    assert.equal(entry.currentAttempts, entry.status === "skipped" ? 0 : 1);
    assert.equal(entry.originalPrompt, null);
    assert.equal(entry.originalSourceSha256, null);
    assert.equal(entry.recoveredOriginalManifest, false);
    assert.match(entry.validationSourceSha256, /^[a-f0-9]{64}$/);
    if (entry.status === "skipped") assert.equal(entry.generatedSha256, null);
    else assert.match(entry.generatedSha256 ?? "", /^[a-f0-9]{64}$/);
  }
});

for (const entry of batch.filter((item) => item.status === "accepted")) {
  test(`第五批分享圖 ${entry.id}：復核文字來源、直式尺寸、容量與完整解碼`, async () => {
    const source = await readFile(
      new URL(`../content/recipes/${entry.id}/recipe.yaml`, import.meta.url),
    );
    const recipe = parse(source.toString());
    assert.equal(recipe.draft, false);
    assert.equal(
      createHash("sha256").update(source).digest("hex"),
      entry.validationSourceSha256,
      "現行菜譜已變動，請重新逐字審核分享圖；此欄不是已遺失的原始生成來源 SHA",
    );
    assert.equal(typeof entry.validationText, "string");
    const text = entry.validationText ?? "";
    for (const value of [recipe.title, recipe.summary, recipe.tip]) {
      assert.ok(text.includes(value));
    }
    assert.ok(
      text.includes(
        `${recipe.servings} 人份・${recipe.timeMinutes} 分鐘・${recipe.category}`,
      ),
    );
    for (const ingredient of recipe.ingredients) {
      const amount = ingredient.amount
        ? ` ${ingredient.amount.value} ${ingredient.amount.unit}`
        : "";
      const note = ingredient.note ? `（${ingredient.note}）` : "";
      assert.ok(text.includes(`${ingredient.name}${amount}${note}`));
    }
    for (const [index, step] of recipe.steps.entries()) {
      assert.ok(text.includes(`${index + 1} ${step.text}`));
    }
    const bytes = await readFile(
      new URL(`../public/prints/${entry.id}.webp`, import.meta.url),
    );
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      entry.webpSha256,
    );
    assert.equal(bytes.length, entry.webpBytes);
    assert.ok(bytes.length <= 300 * 1024);
    assert.equal(entry.webpQuality, 80);
    const metadata = await sharp(bytes).metadata();
    assert.equal(metadata.format, "webp");
    assert.equal(metadata.width, 864);
    assert.equal(metadata.height, 1152);
    await sharp(bytes).raw().toBuffer();
  });
}

test("第五批拒用與預審跳過素材不進公開目錄", async () => {
  for (const entry of batch.filter((item) => item.status !== "accepted")) {
    assert.equal(entry.validationText, null);
    assert.equal(entry.webpSha256, null);
    assert.equal(entry.webpBytes, null);
    await assert.rejects(
      readFile(new URL(`../public/prints/${entry.id}.webp`, import.meta.url)),
      { code: "ENOENT" },
    );
  }
});
