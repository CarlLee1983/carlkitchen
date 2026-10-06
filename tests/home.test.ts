import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyCategoryParam,
  formatDateLabel,
  matchesCategory,
  parseCategoryParam,
  pickRandomIndex,
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

describe("applyCategoryParam", () => {
  it("寫入分類並保留其他參數，不改動輸入", () => {
    const input = new URLSearchParams("q=雞");
    const result = applyCategoryParam(input, "soup");
    assert.equal(result.get("category"), "soup");
    assert.equal(result.get("q"), "雞");
    assert.equal(input.has("category"), false);
  });

  it("選回全部時移除 category 參數", () => {
    const result = applyCategoryParam(
      new URLSearchParams("category=soup&q=雞"),
      "all",
    );
    assert.equal(result.has("category"), false);
    assert.equal(result.get("q"), "雞");
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

describe("pickRandomIndex", () => {
  it("random 的兩端都落在合法索引內", () => {
    assert.equal(
      pickRandomIndex(3, () => 0),
      0,
    );
    assert.equal(
      pickRandomIndex(3, () => 0.999999),
      2,
    );
  });

  it("沒有候選時回傳 -1", () => {
    assert.equal(
      pickRandomIndex(0, () => 0.5),
      -1,
    );
  });
});

describe("formatDateLabel", () => {
  it("格式為「M 月 D 日　週X」", () => {
    assert.equal(formatDateLabel(new Date(2026, 9, 6)), "10 月 6 日　週二");
    assert.equal(formatDateLabel(new Date(2026, 0, 4)), "1 月 4 日　週日");
  });
});
