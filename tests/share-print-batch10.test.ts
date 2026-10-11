import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { test } from "node:test";
import sharp from "sharp";
import { parse } from "yaml";

const batch = JSON.parse(
  await readFile(
    new URL("../.scratch/share-print-images/batch-10.json", import.meta.url),
    "utf8",
  ),
) as Array<{
  id: string;
  status: string;
  sourceSha256: string;
  webpSha256?: string;
  currentAttempts: number;
  historicalAttempts: string;
}>;

for (const entry of batch.filter(
  (item) => item.status !== "rejected" && item.status !== "held-for-review",
)) {
  test(`分享列印圖 ${entry.id}：直式、容量、完整解碼及文字來源未漂移`, async () => {
    const source = await readFile(
      new URL(`../content/recipes/${entry.id}/recipe.yaml`, import.meta.url),
    );
    assert.equal(parse(source.toString()).draft, false);
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
  for (const entry of batch.filter((item) => item.status !== "accepted")) {
    await assert.rejects(
      readFile(new URL(`../public/prints/${entry.id}.webp`, import.meta.url)),
      { code: "ENOENT" },
    );
  }
});

test("第十批每張只做首輪一次且歷史未知，審核狀態完整", () => {
  assert.equal(batch.length, 9);
  for (const entry of batch) {
    assert.ok(
      ["accepted", "rejected", "held-for-review"].includes(entry.status),
    );
    assert.equal(entry.currentAttempts, 1);
    assert.equal(entry.historicalAttempts, "unknown");
  }
});
