import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkCopy } from "../src/content-checks/copy.ts";

const page = (text: string, path = "recipes/alpha/index.html") => ({
  path,
  text,
});

describe("checkCopy", () => {
  it("僅供參考的文案通過", () => {
    assert.deepEqual(
      checkCopy([
        page("<p>菜譜整理自公開資料、經站主審閱，份量與時間僅供參考。</p>"),
      ]),
      [],
    );
  });

  it("頁面提到 AI", () => {
    const issues = checkCopy([page("<p>由 AI 整理</p>")]);
    assert.equal(issues.length, 1);
    assert.equal(issues[0]?.file, "recipes/alpha/index.html");
    assert.match(issues[0]!.message, /AI/);
  });

  it("頁面提到試做", () => {
    const issues = checkCopy([page("<p>未經試做。</p>")]);
    assert.equal(issues.length, 1);
    assert.match(issues[0]!.message, /試做/);
  });

  it("英文單字或檔名雜湊裡的 AI 不算", () => {
    assert.deepEqual(
      checkCopy([
        page('<img srcset="/_astro/hero.91AwEUlz_T2AI9.webp 240w">'),
        page("<p>MAIN_SIZES DETAILS</p>"),
      ]),
      [],
    );
  });

  it("只檢查 HTML 頁面", () => {
    assert.deepEqual(checkCopy([page("AI", "_astro/client.js")]), []);
  });
});
