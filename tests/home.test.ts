import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyHomeState,
  containsAllTerms,
  formatDateLabel,
  normalizeQuery,
  parseHomeState,
  parseKindParam,
  recipeIdFromUrl,
  recipeKinds,
  topicIdFromUrl,
  visibleKindOptions,
} from "../src/utils/home.ts";
import type { RecipeCategory } from "../src/content/recipe-schema.ts";

const ALL_OPTIONS = ["all", "vegetable", "protein", "staple", "soup"] as const;

describe("parseKindParam", () => {
  it("認得每個篩選值，其餘（含缺少、舊的 non-soup）一律視為全部", () => {
    for (const value of ALL_OPTIONS) {
      assert.equal(parseKindParam(value, ALL_OPTIONS), value);
    }
    assert.equal(parseKindParam(null, ALL_OPTIONS), "all");
    assert.equal(parseKindParam("nonsense", ALL_OPTIONS), "all");
    assert.equal(parseKindParam("non-soup", ALL_OPTIONS), "all");
  });

  it("目前被隱藏的選項視為全部", () => {
    assert.equal(parseKindParam("soup", ["all", "vegetable"]), "all");
    assert.equal(
      parseKindParam("vegetable", ["all", "vegetable"]),
      "vegetable",
    );
  });
});

describe("parseHomeState", () => {
  it("同時讀出搜尋字詞 q 與 kind，缺少時各用預設值", () => {
    assert.deepEqual(
      parseHomeState(new URLSearchParams("q=雞&kind=soup"), ALL_OPTIONS),
      { q: "雞", kind: "soup" },
    );
    assert.deepEqual(parseHomeState(new URLSearchParams(""), ALL_OPTIONS), {
      q: "",
      kind: "all",
    });
  });

  it("舊的 category 參數不再處理", () => {
    assert.deepEqual(
      parseHomeState(new URLSearchParams("category=soup"), ALL_OPTIONS),
      { q: "", kind: "all" },
    );
  });

  it("kind 是被隱藏的選項時視為全部", () => {
    assert.equal(
      parseHomeState(new URLSearchParams("kind=soup"), ["all", "protein"]).kind,
      "all",
    );
  });
});

describe("applyHomeState", () => {
  it("寫入 kind 與 q 並保留其他參數，不改動輸入", () => {
    const input = new URLSearchParams("foo=1");
    const result = applyHomeState(input, { q: "雞", kind: "protein" });
    assert.equal(result.get("kind"), "protein");
    assert.equal(result.get("q"), "雞");
    assert.equal(result.get("foo"), "1");
    assert.equal(input.has("kind"), false);
  });

  it("選回全部、q 為空時移除對應參數", () => {
    const result = applyHomeState(new URLSearchParams("kind=soup&q=雞"), {
      q: "",
      kind: "all",
    });
    assert.equal(result.has("kind"), false);
    assert.equal(result.has("q"), false);
  });
});

describe("recipeKinds", () => {
  it("非湯料理依標記回傳蔬菜、肉蛋料理或兩者", () => {
    const base = { category: "非湯料理" as const };
    assert.deepEqual(
      recipeKinds({ ...base, vegetable: true, protein: false }),
      ["vegetable"],
    );
    assert.deepEqual(
      recipeKinds({ ...base, vegetable: false, protein: true }),
      ["protein"],
    );
    assert.deepEqual(recipeKinds({ ...base, vegetable: true, protein: true }), [
      "vegetable",
      "protein",
    ]);
  });

  it("主食回傳 staple，不管標記", () => {
    assert.deepEqual(
      recipeKinds({ category: "主食", vegetable: false, protein: false }),
      ["staple"],
    );
  });

  it("湯回傳 soup", () => {
    assert.deepEqual(
      recipeKinds({ category: "湯", vegetable: false, protein: false }),
      ["soup"],
    );
  });
});

describe("visibleKindOptions", () => {
  const recipe = (
    category: RecipeCategory,
    vegetable: boolean,
    protein: boolean,
  ) => ({
    category,
    vegetable,
    protein,
  });

  it("固定順序，只留至少有一道菜的選項，全部一律顯示", () => {
    assert.deepEqual(
      visibleKindOptions([
        recipe("湯", false, false),
        recipe("非湯料理", true, true),
      ]).map((option) => option.value),
      ["all", "vegetable", "protein", "soup"],
    );
  });

  it("有主食時出現主食選項，位置在肉蛋料理與湯之間", () => {
    assert.deepEqual(
      visibleKindOptions([
        recipe("湯", false, false),
        recipe("主食", false, false),
        recipe("非湯料理", true, true),
      ]).map((option) => option.value),
      ["all", "vegetable", "protein", "staple", "soup"],
    );
    assert.equal(
      visibleKindOptions([recipe("主食", false, false)])[1]?.label,
      "主食",
    );
  });

  it("沒有主食時不顯示主食選項", () => {
    const values = visibleKindOptions([
      recipe("非湯料理", true, true),
      recipe("湯", false, false),
    ]).map((option) => option.value);
    assert.equal(values.includes("staple"), false);
  });

  it("沒有菜的選項不顯示", () => {
    assert.deepEqual(
      visibleKindOptions([recipe("非湯料理", true, false)]).map(
        (option) => option.value,
      ),
      ["all", "vegetable"],
    );
  });

  it("沒有任何菜時仍有全部", () => {
    assert.deepEqual(
      visibleKindOptions([]).map((option) => option.value),
      ["all"],
    );
  });

  it("選項附中文標籤", () => {
    assert.deepEqual(
      visibleKindOptions([recipe("湯", false, false)]).map(
        (option) => option.label,
      ),
      ["全部", "湯"],
    );
  });
});

describe("formatDateLabel", () => {
  it("格式為「M 月 D 日　週X」", () => {
    assert.equal(formatDateLabel(new Date(2026, 9, 6)), "10 月 6 日　週二");
    assert.equal(formatDateLabel(new Date(2026, 0, 4)), "1 月 4 日　週日");
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

describe("topicIdFromUrl", () => {
  it("從 Pagefind 結果網址取出專題識別值，其他網址回傳 null", () => {
    assert.equal(topicIdFromUrl("/topics/knife-skills/"), "knife-skills");
    assert.equal(topicIdFromUrl("/topics/knife-skills"), "knife-skills");
    assert.equal(topicIdFromUrl("/topics/"), null);
    assert.equal(topicIdFromUrl("/recipes/tomato-egg/"), null);
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
