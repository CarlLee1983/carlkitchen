import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterDrafts } from "../src/utils/drafts.ts";

const entries = [
  { id: "a", data: { draft: false } },
  { id: "b", data: { draft: true } },
];

describe("filterDrafts", () => {
  it("正式建置排除草稿", () => {
    assert.deepEqual(
      filterDrafts(entries, false).map((entry) => entry.id),
      ["a"],
    );
  });

  it("開發模式保留草稿，且不改動輸入", () => {
    assert.equal(filterDrafts(entries, true).length, 2);
    assert.equal(entries.length, 2);
  });
});
