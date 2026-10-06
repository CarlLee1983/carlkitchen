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

  it("草稿識別值是常見英文單字時，內文出現該字不誤報", () => {
    assert.deepEqual(
      checkLeaks({
        files: [
          { path: "x.js", text: "const rice = soup; // rice soup" },
          { path: "recipes/alpha/index.html", text: "rice and soup" },
        ],
        draftIds: ["rice", "soup"],
        sourceUrls: [],
      }),
      [],
    );
  });

  it("草稿識別值以大小寫混寫或 URL 編碼出現在頁面連結", () => {
    for (const text of [
      "/Recipes/Secret-Draft/",
      "%2Frecipes%2Fsecret-draft%2F",
    ]) {
      const issues = checkLeaks({
        files: [{ path: "x.json", text }],
        draftIds: ["secret-draft"],
        sourceUrls: [],
      });
      assert.equal(issues.length, 1, text);
    }
  });
});

describe("checkLeaks 來源網址變形", () => {
  const source = "https://Example.com/Source/alpha?a=1&b=2#frag";
  const variants: Record<string, string> = {
    原樣: "https://Example.com/Source/alpha?a=1&b=2#frag",
    結尾斜線: "https://example.com/source/alpha/",
    主機大寫: "https://EXAMPLE.COM/source/alpha",
    改用http: "http://example.com/source/alpha",
    無scheme: "//example.com/source/alpha",
    去掉query: "https://example.com/source/alpha",
    加www: "https://www.example.com/source/alpha?x=1",
    encodeURIComponent: encodeURIComponent(
      "https://example.com/source/alpha?a=1&b=2",
    ),
    HTML數字實體: "https://example.com/source/alpha?a=1&#38;b=2",
    HTML十六進位實體: "https:&#x2F;&#x2F;example.com&#x2F;source&#x2F;alpha",
    HTML跳脫: "https://example.com/source/alpha?a=1&amp;b=2",
    JSON跳脫斜線加and: "https:\\/\\/example.com\\/source\\/alpha?a=1&b=2",
    JSON_u0026: "https://example.com/source/alpha?a=1\\u0026b=2",
    JSON_u002f: "https:\\u002f\\u002fexample.com\\u002fsource\\u002falpha",
    百分比編碼損毀時保留原文: "100%zz https://example.com/source/alpha",
  };
  for (const [name, text] of Object.entries(variants)) {
    it(`抓到：${name}`, () => {
      const issues = checkLeaks({
        files: [{ path: "x.html", text }],
        draftIds: [],
        sourceUrls: [source],
      });
      assert.equal(issues.length, 1);
      assert.equal(issues[0]?.file, "x.html");
    });
  }

  it("來源指向站台首頁時，出現該主機即視為外洩（保守）", () => {
    const issues = checkLeaks({
      files: [{ path: "x.html", text: "see example.com today" }],
      draftIds: [],
      sourceUrls: ["https://example.com/"],
    });
    assert.equal(issues.length, 1);
  });

  it("不相干的網址不誤報", () => {
    assert.deepEqual(
      checkLeaks({
        files: [{ path: "x.html", text: "https://example.com/other" }],
        draftIds: [],
        sourceUrls: [source],
      }),
      [],
    );
  });
});
