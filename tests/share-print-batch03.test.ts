import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { test } from "node:test";
import sharp from "sharp";
import { parse } from "yaml";

const batch = JSON.parse(
  await readFile(
    new URL("../.scratch/share-print-images/batch-03.json", import.meta.url),
    "utf8",
  ),
) as Array<{
  id: string;
  status: string;
  sourceSha256: string;
  webpSha256?: string;
  currentAttempts: number;
  historicalAttempts: string;
  generatedSha256: string;
  prompt: string;
}>;

test("第三批十道分享圖都有一次生成紀錄與終態，不重置未知歷史", () => {
  assert.equal(batch.length, 10);
  assert.equal(new Set(batch.map((entry) => entry.id)).size, 10);
  for (const entry of batch) {
    assert.equal(entry.currentAttempts, 1);
    assert.equal(entry.historicalAttempts, "unknown");
    assert.match(entry.generatedSha256, /^[a-f0-9]{64}$/);
    assert.ok(["accepted", "rejected"].includes(entry.status));
  }
});

for (const entry of batch.filter((item) => item.status === "accepted")) {
  test(`分享列印圖 ${entry.id}：直式、容量、完整解碼及文字來源未漂移`, async () => {
    const source = await readFile(
      new URL(`../content/recipes/${entry.id}/recipe.yaml`, import.meta.url),
    );
    const recipe = parse(source.toString());
    assert.equal(recipe.draft, false);
    for (const text of [recipe.title, recipe.summary, recipe.tip]) {
      assert.ok(entry.prompt.includes(text));
    }
    assert.ok(
      entry.prompt.includes(
        `${recipe.servings} 人份・${recipe.timeMinutes} 分鐘・${recipe.category}`,
      ),
    );
    for (const ingredient of recipe.ingredients) {
      const amount = ingredient.amount
        ? ` ${ingredient.amount.value} ${ingredient.amount.unit}`
        : "";
      const note = ingredient.note ? `（${ingredient.note}）` : "";
      assert.ok(entry.prompt.includes(`${ingredient.name}${amount}${note}`));
    }
    for (const [index, step] of recipe.steps.entries()) {
      assert.ok(entry.prompt.includes(`${index + 1} ${step.text}`));
    }
    assert.equal(
      createHash("sha256").update(source).digest("hex"),
      entry.sourceSha256,
      "菜譜文字有變，請同步人工核對分享圖，再更新審核記錄",
    );
    const bytes = await readFile(
      new URL(`../public/prints/${entry.id}.webp`, import.meta.url),
    );
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      entry.webpSha256,
    );
    assert.ok(bytes.length <= 300 * 1024);
    const metadata = await sharp(bytes).metadata();
    assert.equal(metadata.format, "webp");
    assert.equal(metadata.width, 864);
    assert.equal(metadata.height, 1152);
    await sharp(bytes).raw().toBuffer();
    assert.equal(entry.currentAttempts, 1);
  });
}

test("未通過人工審核的分享圖不進公開素材", async () => {
  for (const entry of batch.filter((item) => item.status === "rejected")) {
    await assert.rejects(
      readFile(new URL(`../public/prints/${entry.id}.webp`, import.meta.url)),
      { code: "ENOENT" },
    );
  }
});
