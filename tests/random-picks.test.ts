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

  it("一輪內連續抽批不重複，12 道分兩批剛好抽完，第三批開始新的一輪", () => {
    const candidates = ids("abcdefghijkl");
    const first = pickBatch(
      candidates,
      new Set(),
      sequence(0.99, 0, 0, 0, 0, 0),
    );
    assert.deepEqual(first.picks, ids("lbcdef"));
    const second = pickBatch(candidates, first.seen, zero);
    // 剩下的 g、h、i、j、k、a 都沒出現過，依候選順序取前 6 道
    assert.deepEqual(second.picks, ids("aghijk"));
    assert.equal(
      new Set([...first.picks, ...second.picks]).size,
      first.picks.length + second.picks.length,
    );
    const third = pickBatch(candidates, second.seen, zero);
    assert.deepEqual(third.picks, ids("abcdef"));
    assert.deepEqual([...third.seen].sort(), ids("abcdef"));
  });

  it("8 道連抽三批：跨輪補滿的每一批內都不重複，輪次依序推進", () => {
    const candidates = ids("abcdefgh");
    const first = pickBatch(candidates, new Set(), zero);
    assert.deepEqual(first.picks, ids("abcdef"));
    // 沒出現過的只剩 g、h：先放入，再從其餘 6 道補 4 道（亂數 0 取最前面）
    const second = pickBatch(candidates, first.seen, zero);
    assert.deepEqual(second.picks, ids("ghabcd"));
    assert.deepEqual([...second.seen].sort(), ids("abcdgh"));
    // 新一輪裡沒出現過的剩 e、f：先放入，再從 a、b、c、d、g、h 補 4 道
    const third = pickBatch(candidates, second.seen, zero);
    assert.deepEqual(third.picks, ids("efabcd"));
    for (const batch of [first, second, third]) {
      assert.equal(new Set(batch.picks).size, PICK_BATCH_SIZE);
    }
  });

  it("補滿時亂數落在後段也不會抽到已在本批的識別值", () => {
    // 情境：a–e 已出現，f、g、h 沒出現過，先入選；其餘 3 道從 a–e 補，亂數落在後段。
    // 預期：補進來的是 e、d、c，與 f、g、h 都不重複。
    const { picks } = pickBatch(
      ids("abcdefgh"),
      new Set(ids("abcde")),
      sequence(0.99, 0.5, 0),
    );
    assert.deepEqual(picks, ids("fghedc"));
  });
});
