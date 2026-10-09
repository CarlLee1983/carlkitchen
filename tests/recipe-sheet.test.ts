import { test } from "node:test";
import assert from "node:assert/strict";
import { shareRecipeSheet } from "../src/utils/recipe-sheet.ts";

const file = new File(["image"], "tomato-egg.webp", { type: "image/webp" });

test("分享傳送原圖檔案", async () => {
  let received: ShareData | undefined;
  const result = await shareRecipeSheet(file, {
    canShare: () => true,
    share: async (data) => {
      received = data;
    },
  });
  assert.equal(result, "shared");
  assert.deepEqual(received?.files, [file]);
});

test("不支援、沒有檔案、能力偵測丟錯均提供備援", async () => {
  assert.equal(await shareRecipeSheet(file, {}), "unavailable");
  assert.equal(await shareRecipeSheet(null, {}), "unavailable");
  assert.equal(
    await shareRecipeSheet(file, {
      canShare: () => false,
      share: async () => assert.fail(),
    }),
    "unavailable",
  );
  assert.equal(
    await shareRecipeSheet(file, {
      canShare: () => {
        throw new TypeError();
      },
      share: async () => assert.fail(),
    }),
    "unavailable",
  );
});

for (const [name, expected] of [
  ["AbortError", "cancelled"],
  ["NotAllowedError", "failed"],
]) {
  test(`分享 ${name} 回報 ${expected}`, async () => {
    assert.equal(
      await shareRecipeSheet(file, {
        canShare: () => true,
        share: async () => {
          throw new DOMException("", name);
        },
      }),
      expected,
    );
  });
}
