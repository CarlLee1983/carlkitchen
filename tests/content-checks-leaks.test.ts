import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkLeaks } from "../src/content-checks/leaks.ts";

const clean = [
  { path: "index.html", text: '<a href="/recipes/alpha/">alpha</a>' },
  { path: "recipes/alpha/index.html", text: "<h1>alpha</h1>" },
];

describe("checkLeaks", () => {
  it("乾淨的輸出通過", () => {
    assert.deepEqual(
      checkLeaks({
        files: clean,
        draftIds: ["secret-draft"],
        sourceUrls: ["https://example.com/src?a=1&b=2"],
      }),
      [],
    );
  });

  it("草稿頁面路徑出現在輸出", () => {
    const issues = checkLeaks({
      files: [...clean, { path: "recipes/secret-draft/index.html", text: "" }],
      draftIds: ["secret-draft"],
      sourceUrls: [],
    });
    assert.equal(issues[0]?.recipe, "secret-draft");
    assert.equal(issues[0]?.file, "recipes/secret-draft/index.html");
  });

  it("草稿 slug 出現在檔案內容", () => {
    const issues = checkLeaks({
      files: [{ path: "index.html", text: "href=/recipes/secret-draft/" }],
      draftIds: ["secret-draft"],
      sourceUrls: [],
    });
    assert.equal(issues[0]?.recipe, "secret-draft");
    assert.equal(issues[0]?.file, "index.html");
  });

  it("較長的公開 slug 包含草稿 slug 時不誤報", () => {
    assert.deepEqual(
      checkLeaks({
        files: [{ path: "index.html", text: "/recipes/tea-egg/" }],
        draftIds: ["tea"],
        sourceUrls: [],
      }),
      [],
    );
  });

  it("來源網址出現在輸出，含 HTML 與 JSON 跳脫形式", () => {
    const url = "https://example.com/src?a=1&b=2";
    for (const text of [
      url,
      "https://example.com/src?a=1&amp;b=2",
      "https:\\/\\/example.com\\/src?a=1&b=2",
    ]) {
      const issues = checkLeaks({
        files: [{ path: "x.json", text }],
        draftIds: [],
        sourceUrls: [url],
      });
      assert.equal(issues.length, 1, text);
      assert.equal(issues[0]?.file, "x.json");
      assert.match(issues[0]!.message, /example\.com/);
    }
  });
});
