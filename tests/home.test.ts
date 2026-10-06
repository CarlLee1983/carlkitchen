import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyHomeState,
  categoryFilterValue,
  containsAllTerms,
  formatDateLabel,
  matchesCategory,
  normalizeQuery,
  parseCategoryParam,
  parseHomeState,
  recipeIdFromUrl,
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

describe("categoryFilterValue", () => {
  it("菜譜分類對應網址與 Pagefind 篩選值", () => {
    assert.equal(categoryFilterValue("湯"), "soup");
    assert.equal(categoryFilterValue("非湯料理"), "non-soup");
  });
});

describe("normalizeQuery", () => {
  it("去掉前後空白，只有空白視為沒有字詞", () => {
    assert.equal(normalizeQuery("  番茄 "), "番茄");
    assert.equal(normalizeQuery("   "), "");
  });
});

describe("recipeIdFromUrl", () => {
  it("從 Pagefind 結果網址取出菜譜識別值，其他網址回傳 null", () => {
    assert.equal(recipeIdFromUrl("/recipes/tomato-egg/"), "tomato-egg");
    assert.equal(recipeIdFromUrl("/recipes/tomato-egg"), "tomato-egg");
    assert.equal(recipeIdFromUrl("/meal/"), null);
    assert.equal(recipeIdFromUrl("/"), null);
  });
});

describe("containsAllTerms", () => {
  const content = "蛋花湯​. 水滾後淋入蛋液​，輕推成蛋花。 Tomato 番茄";

  it("每個字詞都在內容中才符合（忽略零寬空白與大小寫）", () => {
    assert.equal(containsAllTerms(content, "蛋花"), true);
    assert.equal(containsAllTerms(content, "tomato 番茄"), true);
    assert.equal(containsAllTerms(content, "蛋花 番茄"), true);
  });

  it("多字中文查詢不退回部分匹配", () => {
    assert.equal(containsAllTerms(content, "不存在的詞"), false);
    assert.equal(containsAllTerms(content, "配一桌四菜一湯"), false);
    assert.equal(containsAllTerms(content, "蛋花 不存在"), false);
  });

  it("沒有字詞（空白或標點）時符合", () => {
    assert.equal(containsAllTerms(content, "  "), true);
    assert.equal(containsAllTerms(content, "，"), true);
  });
});
