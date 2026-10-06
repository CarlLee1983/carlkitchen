import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyHomeState,
  formatDateLabel,
  matchesCategory,
  parseCategoryParam,
  parseHomeState,
} from "../src/utils/home.ts";

describe("parseCategoryParam", () => {
  it("認得 soup 與 non-soup，其餘（含缺少）一律視為全部", () => {
    assert.equal(parseCategoryParam("soup"), "soup");
    assert.equal(parseCategoryParam("non-soup"), "non-soup");
    assert.equal(parseCategoryParam("all"), "all");
    assert.equal(parseCategoryParam(null), "all");
    assert.equal(parseCategoryParam("nonsense"), "all");
  });
});

describe("parseHomeState", () => {
  it("同時讀出搜尋字詞 q 與分類，缺少時各用預設值", () => {
    assert.deepEqual(
      parseHomeState(new URLSearchParams("q=雞&category=soup")),
      {
        q: "雞",
        category: "soup",
      },
    );
    assert.deepEqual(parseHomeState(new URLSearchParams("")), {
      q: "",
      category: "all",
    });
  });
});

describe("applyHomeState", () => {
  it("寫入分類與 q 並保留其他參數，不改動輸入", () => {
    const input = new URLSearchParams("foo=1");
    const result = applyHomeState(input, { q: "雞", category: "soup" });
    assert.equal(result.get("category"), "soup");
    assert.equal(result.get("q"), "雞");
    assert.equal(result.get("foo"), "1");
    assert.equal(input.has("category"), false);
  });

  it("選回全部、q 為空時移除對應參數", () => {
    const result = applyHomeState(new URLSearchParams("category=soup&q=雞"), {
      q: "",
      category: "all",
    });
    assert.equal(result.has("category"), false);
    assert.equal(result.has("q"), false);
  });
});

describe("matchesCategory", () => {
  it("全部放行；非湯料理與湯各只放行自己", () => {
    assert.equal(matchesCategory("all", "湯"), true);
    assert.equal(matchesCategory("all", "非湯料理"), true);
    assert.equal(matchesCategory("soup", "湯"), true);
    assert.equal(matchesCategory("soup", "非湯料理"), false);
    assert.equal(matchesCategory("non-soup", "非湯料理"), true);
    assert.equal(matchesCategory("non-soup", "湯"), false);
  });
});

describe("formatDateLabel", () => {
  it("格式為「M 月 D 日　週X」", () => {
    assert.equal(formatDateLabel(new Date(2026, 9, 6)), "10 月 6 日　週二");
    assert.equal(formatDateLabel(new Date(2026, 0, 4)), "1 月 4 日　週日");
  });
});
