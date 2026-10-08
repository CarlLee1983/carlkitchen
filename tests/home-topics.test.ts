import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { z } from "astro/zod";
import { createTopicSchema } from "../src/content/topic-schema.ts";
import { selectHomeTopic } from "../src/utils/home-topics.ts";
import { homeTopicIssues } from "../src/utils/home-topics.ts";

const winter = {
  id: "winter",
  homeRecommendation: {
    kind: "recurring",
    start: "11-01",
    end: "01-31",
    priority: 2,
  },
} as const;
const fallback = { id: "basics", homeFallback: true };
const date = (value: string) => new Date(`${value}T12:00:00+08:00`);

describe("首頁專題檔期", () => {
  it("跨年期間含起訖日，外部日期回到常青備選", () => {
    for (const value of [
      "2026-11-01",
      "2026-12-31",
      "2027-01-01",
      "2027-01-31",
      "2028-11-01",
    ]) {
      assert.equal(selectHomeTopic([winter, fallback], date(value)), "winter");
    }
    for (const value of ["2026-10-31", "2027-02-01"]) {
      assert.equal(selectHomeTopic([winter, fallback], date(value)), "basics");
    }
  });
  it("以台北日期判斷而非 UTC 日，檔期重疊依順位，年度檔期不沿用至次年", () => {
    const festival = {
      id: "festival",
      homeRecommendation: {
        kind: "dated",
        start: "2026-11-01",
        end: "2026-11-03",
        priority: 1,
      },
    } as const;
    const pool = [winter, fallback, festival];
    assert.equal(
      selectHomeTopic(pool, new Date("2026-10-31T16:00:00Z")),
      "festival",
    );
    assert.equal(selectHomeTopic(pool, date("2026-11-03")), "festival");
    assert.equal(selectHomeTopic(pool, date("2026-11-04")), "winter");
    assert.equal(selectHomeTopic(pool, date("2027-11-01")), "winter");
  });
  it("一般季節期間、單日檔期與無備選的空集合", () => {
    const summer = {
      id: "summer",
      homeRecommendation: {
        kind: "recurring",
        start: "06-01",
        end: "08-31",
        priority: 1,
      },
    } as const;
    assert.equal(selectHomeTopic([summer], date("2026-07-01")), "summer");
    assert.equal(selectHomeTopic([summer], date("2026-11-01")), undefined);
    assert.equal(selectHomeTopic([], date("2026-11-01")), undefined);
    assert.equal(
      selectHomeTopic(
        [
          {
            id: "single",
            homeRecommendation: {
              ...summer.homeRecommendation,
              start: "06-01",
              end: "06-01",
            },
          },
        ],
        date("2026-06-02"),
      ),
      undefined,
    );
  });
  it("檔期資料不得有草稿、重複順位或多個備選", () => {
    assert.equal(
      homeTopicIssues([
        { ...winter, draft: false },
        { ...fallback, draft: false },
      ]).length,
      0,
    );
    assert.ok(
      homeTopicIssues([{ ...winter, draft: true }]).some(
        (issue) => issue.id === "winter",
      ),
    );
    assert.ok(
      homeTopicIssues([
        { ...fallback, draft: false },
        { id: "other", draft: false, homeFallback: true },
      ]).length > 0,
    );
    assert.ok(
      homeTopicIssues([
        { ...winter, draft: false },
        { ...winter, id: "other", draft: false },
      ]).length > 0,
    );
  });
});

describe("專題推薦欄位", () => {
  const schema = createTopicSchema(z.string());
  const topic = {
    title: "專題",
    summary: "短介",
    draft: false,
    publishedAt: "2026-10-08",
    hero: { src: "hero.webp", alt: "食材" },
    relatedRecipes: [],
    relatedIngredients: [],
    references: [],
  };
  it("舊專題預設不推薦，接受合法跨年與年度期間", () => {
    assert.equal(schema.parse(topic).homeFallback, false);
    assert.equal(
      schema.parse({ ...topic, homeRecommendation: winter.homeRecommendation })
        .homeRecommendation?.start,
      "11-01",
    );
    assert.equal(
      schema.safeParse({
        ...topic,
        homeRecommendation: {
          kind: "dated",
          start: "2026-12-30",
          end: "2027-01-02",
          priority: 1,
        },
      }).success,
      true,
    );
  });
  it("拒絕無效日、格式、反向年度期間與順位", () => {
    for (const bad of [
      { ...winter.homeRecommendation, start: "02-30" },
      { ...winter.homeRecommendation, start: "02-29" },
      { ...winter.homeRecommendation, end: "13-01" },
      { ...winter.homeRecommendation, start: "1-1" },
      { ...winter.homeRecommendation, priority: 0 },
      { ...winter.homeRecommendation, priority: 1.5 },
      { kind: "dated", start: "2026-02-29", end: "2026-03-01", priority: 1 },
      { kind: "dated", start: "2026-12-31", end: "2026-01-01", priority: 1 },
    ])
      assert.equal(
        schema.safeParse({ ...topic, homeRecommendation: bad }).success,
        false,
      );
  });
});
