import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pickBatch, PICK_BATCH_SIZE } from "../src/utils/random-picks.ts";

/** 依序回傳固定值的亂數來源；用完即拋錯，抓出多餘的抽取。 */
function sequence(...values: number[]) {
  let index = 0;
  return () => {
    const value = values[index++];
    if (value === undefined) throw new Error("亂數序列用完了");
    return value;
  };
}
const zero = () => 0;
const ids = (text: string) => text.split("");

describe("pickBatch", () => {
  it("一批是 6 道", () => {
    assert.equal(PICK_BATCH_SIZE, 6);
  });

  it("候選不超過一批時全部回傳，不使用亂數", () => {
    const { picks, seen } = pickBatch(ids("abc"), new Set(), () => {
      throw new Error("不該取亂數");
    });
    assert.deepEqual(picks, ["a", "b", "c"]);
    assert.deepEqual([...seen].sort(), ["a", "b", "c"]);
  });

  it("沒有候選時回傳空批", () => {
    const { picks, seen } = pickBatch([], new Set(["x"]), zero);
    assert.deepEqual(picks, []);
    assert.equal(seen.size, 0);
  });

  it("亂數決定抽中誰：亂數 0 取最前面 6 道", () => {
    const { picks } = pickBatch(ids("abcdefgh"), new Set(), zero);
    assert.deepEqual(picks, ids("abcdef"));
  });

  it("亂數接近 1 時抽到後面的候選，且同一批內不重複", () => {
    // 第一抽 floor(0.99 × 8) = 7 取 h；其後每抽都取剩餘的第一道。
    const { picks } = pickBatch(
      ids("abcdefgh"),
      new Set(),
      sequence(0.99, 0, 0, 0, 0, 0),
    );
    assert.deepEqual(picks, ids("hbcdef"));
    assert.equal(new Set(picks).size, picks.length);
  });

  it("先抽還沒出現過的，並把本批併入已出現集合", () => {
    const { picks, seen } = pickBatch(
      ids("abcdefghijkl"),
      new Set(ids("abcdef")),
      zero,
    );
    assert.deepEqual(picks, ids("ghijkl"));
    assert.deepEqual([...seen].sort(), ids("abcdefghijkl"));
  });

  it("沒出現過的不足一批時全部先出，再從新一輪補滿且不重複，已出現集合只剩本批", () => {
    const { picks, seen } = pickBatch(
      ids("abcdefgh"),
      new Set(ids("abc")),
      zero,
    );
    assert.deepEqual(picks, ids("defgha"));
    assert.deepEqual([...seen].sort(), ids("adefgh"));
  });

  it("全部都出現過時開始新的一輪", () => {
    const { picks, seen } = pickBatch(
      ids("abcdefgh"),
      new Set(ids("abcdefgh")),
      zero,
    );
    assert.deepEqual(picks, ids("abcdef"));
    assert.deepEqual([...seen].sort(), ids("abcdef"));
  });

  it("已出現集合裡不在候選內的識別值（如換了篩選）不影響結果", () => {
    const { picks } = pickBatch(ids("abcdefgh"), new Set(["zz"]), zero);
    assert.deepEqual(picks, ids("abcdef"));
  });

  it("不改動輸入，也不呼叫全域亂數", () => {
    const candidates = Object.freeze(ids("abcdefgh"));
    const seenInput = new Set(ids("ab"));
    const original = Math.random;
    Math.random = () => {
      throw new Error("不該呼叫全域亂數");
    };
    try {
      pickBatch(candidates, seenInput, zero);
    } finally {
      Math.random = original;
    }
    assert.deepEqual(candidates, ids("abcdefgh"));
    assert.deepEqual([...seenInput], ids("ab"));
  });
});
