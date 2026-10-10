import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyHomeState,
  DEFAULT_BATCH_SIZE,
  containsAllTerms,
  formatDateLabel,
  normalizeQuery,
  parseHomeState,
  parseBatchSize,
  parseKindParam,
  readSavedCount,
  readSavedScroll,
  recipeIdFromUrl,
  recipeKinds,
  recipeKindLabels,
  showMore,
  topicIdFromUrl,
  truncateRows,
  visibleKindOptions,
} from "../src/utils/home.ts";
import type { DishKind, RecipeCategory } from "../src/content/recipe-schema.ts";

const ALL_OPTIONS = [
  "all",
  "vegetable",
  "meat",
  "seafood",
  "egg-bean",
  "staple",
  "soup",
] as const;

describe("parseKindParam", () => {
  it("認得每個篩選值，其餘（含缺少、舊的 non-soup）一律視為全部", () => {
    for (const value of ALL_OPTIONS) {
      assert.equal(parseKindParam(value, ALL_OPTIONS), value);
    }
    assert.equal(parseKindParam(null, ALL_OPTIONS), "all");
    assert.equal(parseKindParam("nonsense", ALL_OPTIONS), "all");
    assert.equal(parseKindParam("non-soup", ALL_OPTIONS), "all");
    assert.equal(parseKindParam("protein", ALL_OPTIONS), "all");
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
      parseHomeState(new URLSearchParams("kind=soup"), ["all", "meat"]).kind,
      "all",
    );
  });
});

describe("applyHomeState", () => {
  it("寫入 kind 與 q 並保留其他參數，不改動輸入", () => {
    const input = new URLSearchParams("foo=1");
    const result = applyHomeState(input, { q: "雞", kind: "meat" });
    assert.equal(result.get("kind"), "meat");
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
  it("瀏覽依料理主角分類，不把配桌角色當分類", () => {
    const mixed = {
      category: "非湯料理" as const,
      dishKinds: ["vegetable", "egg-bean"] as DishKind[],
      vegetable: false,
      protein: true,
    };
    assert.deepEqual(recipeKinds(mixed), ["vegetable", "egg-bean"]);
    for (const dishKind of [
      "vegetable",
      "meat",
      "seafood",
      "egg-bean",
    ] as const) {
      assert.deepEqual(
        recipeKinds({ category: "非湯料理", dishKinds: [dishKind] }),
        [dishKind],
      );
    }
  });

  it("主食回傳 staple、湯回傳 soup", () => {
    assert.deepEqual(recipeKinds({ category: "主食", dishKinds: [] }), [
      "staple",
    ]);
    assert.deepEqual(recipeKinds({ category: "湯", dishKinds: [] }), ["soup"]);
  });
});

describe("recipeKindLabels", () => {
  it("所有標籤與篩選一致，雙主角各自顯示", () => {
    assert.deepEqual(
      recipeKindLabels({
        category: "非湯料理",
        dishKinds: ["vegetable", "meat", "seafood", "egg-bean"],
      }),
      ["蔬菜", "肉類", "海鮮", "蛋豆"],
    );
    assert.deepEqual(recipeKindLabels({ category: "主食", dishKinds: [] }), [
      "主食",
    ]);
    assert.deepEqual(recipeKindLabels({ category: "湯", dishKinds: [] }), [
      "湯",
    ]);
  });
});

describe("visibleKindOptions", () => {
  const recipe = (category: RecipeCategory, dishKinds: DishKind[]) => ({
    category,
    dishKinds,
  });

  it("固定順序，只留至少有一道菜的選項，全部一律顯示", () => {
    assert.deepEqual(
      visibleKindOptions([
        recipe("湯", []),
        recipe("非湯料理", ["egg-bean", "vegetable"]),
      ]).map((option) => option.value),
      ["all", "vegetable", "egg-bean", "soup"],
    );
  });

  it("七個選項各有菜時，標籤與順序固定", () => {
    assert.deepEqual(
      visibleKindOptions([
        recipe("湯", []),
        recipe("主食", []),
        recipe("非湯料理", ["egg-bean", "seafood", "meat", "vegetable"]),
      ]),
      [
        { value: "all", label: "全部" },
        { value: "vegetable", label: "蔬菜" },
        { value: "meat", label: "肉類" },
        { value: "seafood", label: "海鮮" },
        { value: "egg-bean", label: "蛋豆" },
        { value: "staple", label: "主食" },
        { value: "soup", label: "湯" },
      ],
    );
  });

  it("沒有主食時不顯示主食選項", () => {
    const values = visibleKindOptions([
      recipe("非湯料理", ["vegetable"]),
      recipe("湯", []),
    ]).map((option) => option.value);
    assert.equal(values.includes("staple"), false);
  });

  it("沒有菜的選項不顯示", () => {
    assert.deepEqual(
      visibleKindOptions([recipe("非湯料理", ["vegetable"])]).map(
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
      visibleKindOptions([recipe("湯", [])]).map((option) => option.label),
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

describe("parseBatchSize", () => {
  it("未設定或空字串用預設值", () => {
    assert.equal(parseBatchSize(undefined), DEFAULT_BATCH_SIZE);
    assert.equal(parseBatchSize(""), DEFAULT_BATCH_SIZE);
  });

  it("接受正整數", () => {
    assert.equal(parseBatchSize("2"), 2);
    assert.equal(parseBatchSize("20"), 20);
  });

  it("非正整數丟錯並說明", () => {
    for (const raw of ["0", "-3", "1.5", "abc", " 2", "2x"]) {
      assert.throws(() => parseBatchSize(raw), /HOME_BATCH_SIZE/, raw);
    }
  });
});

describe("truncateRows", () => {
  it("總數小於一批：全部顯示、沒有剩餘", () => {
    assert.deepEqual(truncateRows(5, 20), {
      shown: 5,
      remaining: 0,
      nextCount: 0,
    });
  });

  it("總數等於一批：全部顯示、沒有剩餘", () => {
    assert.deepEqual(truncateRows(20, 20), {
      shown: 20,
      remaining: 0,
      nextCount: 0,
    });
  });

  it("總數大於一批：未設定時顯示一批", () => {
    assert.deepEqual(truncateRows(68, 20), {
      shown: 20,
      remaining: 48,
      nextCount: 20,
    });
  });

  it("最後一批不足：下次只再顯示剩餘的數量", () => {
    assert.deepEqual(truncateRows(68, 20, 60), {
      shown: 60,
      remaining: 8,
      nextCount: 8,
    });
  });

  it("要求的數量超過總數或小於一批時夾到範圍內", () => {
    assert.deepEqual(truncateRows(68, 20, 500), {
      shown: 68,
      remaining: 0,
      nextCount: 0,
    });
    assert.deepEqual(truncateRows(68, 20, 3), {
      shown: 20,
      remaining: 48,
      nextCount: 20,
    });
    assert.deepEqual(truncateRows(5, 20, 100), {
      shown: 5,
      remaining: 0,
      nextCount: 0,
    });
  });

  it("沒有列時什麼都不顯示", () => {
    assert.deepEqual(truncateRows(0, 20), {
      shown: 0,
      remaining: 0,
      nextCount: 0,
    });
  });
});

describe("readSavedCount", () => {
  it("只認 history state 裡的正整數 showMore", () => {
    assert.equal(readSavedCount({ showMoreCount: 40 }), 40);
    assert.equal(readSavedCount({ other: 1, showMoreCount: 3 }), 3);
  });

  it("其他一律視為沒有保存值", () => {
    for (const state of [
      null,
      undefined,
      "showMore",
      42,
      [],
      {},
      { showMoreCount: "40" },
      { showMoreCount: 0 },
      { showMoreCount: -5 },
      { showMoreCount: 1.5 },
      { showMoreCount: Number.NaN },
      { showMoreCount: Number.POSITIVE_INFINITY },
    ]) {
      assert.equal(readSavedCount(state), undefined, JSON.stringify(state));
    }
  });
});

describe("readSavedScroll", () => {
  it("接受 0 與正數", () => {
    assert.equal(readSavedScroll({ showMoreScrollY: 0 }), 0);
    assert.equal(readSavedScroll({ showMoreScrollY: 1234.5 }), 1234.5);
  });

  it("其他一律視為沒有保存值", () => {
    for (const state of [
      null,
      "x",
      {},
      { showMoreScrollY: "10" },
      { showMoreScrollY: -1 },
      { showMoreScrollY: Number.NaN },
      { showMoreScrollY: Number.POSITIVE_INFINITY },
    ]) {
      assert.equal(readSavedScroll(state), undefined, JSON.stringify(state));
    }
  });
});

describe("showMore", () => {
  it("多顯示一批，新出現的第一列是原本顯示數量的位置", () => {
    assert.deepEqual(showMore(68, 20), {
      shown: 40,
      remaining: 28,
      nextCount: 20,
      firstNewIndex: 20,
    });
  });

  it("最後一批不足時只多顯示剩餘的數量", () => {
    assert.deepEqual(showMore(68, 20, 60), {
      shown: 68,
      remaining: 0,
      nextCount: 0,
      firstNewIndex: 60,
    });
  });

  it("要求的數量小於一批時先夾回一批再多顯示一批", () => {
    assert.deepEqual(showMore(68, 20, 3), {
      shown: 40,
      remaining: 28,
      nextCount: 20,
      firstNewIndex: 20,
    });
  });

  it("已全部顯示或總數不超過一批時沒有新列", () => {
    assert.deepEqual(showMore(68, 20, 68), {
      shown: 68,
      remaining: 0,
      nextCount: 0,
      firstNewIndex: null,
    });
    assert.equal(showMore(5, 20).firstNewIndex, null);
  });
});
