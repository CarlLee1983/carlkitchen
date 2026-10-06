import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  checkSourceCoverage,
  parseSourceRecord,
} from "../src/content-checks/sources.ts";

describe("parseSourceRecord", () => {
  it("至少一個網址即通過", () => {
    const { urls, issues } = parseSourceRecord("s/a.yaml", {
      urls: ["https://example.com/a"],
    });
    assert.deepEqual(issues, []);
    assert.deepEqual(urls, ["https://example.com/a"]);
  });

  it("網址清單為空時失敗並指出檔案與欄位", () => {
    const { issues } = parseSourceRecord("s/a.yaml", { urls: [] });
    assert.equal(issues[0]?.file, "s/a.yaml");
    assert.equal(issues[0]?.field, "urls");
  });

  it("網址格式錯誤或非 http(s) 時失敗", () => {
    const bad = parseSourceRecord("s/a.yaml", { urls: ["not a url"] });
    const ftp = parseSourceRecord("s/a.yaml", { urls: ["ftp://x.test/a"] });
    assert.equal(bad.issues[0]?.field, "urls.0");
    assert.equal(ftp.issues[0]?.field, "urls.0");
  });

  it("不是物件時失敗", () => {
    const { issues } = parseSourceRecord("s/a.yaml", null);
    assert.equal(issues.length, 1);
    assert.equal(issues[0]?.file, "s/a.yaml");
  });
});

describe("checkSourceCoverage", () => {
  const base = {
    sourcesDir: "content/sources",
    recipeIds: ["a", "b", "draft"],
    publicIds: ["a", "b"],
  };

  it("每份公開菜譜都有紀錄、沒有孤兒時通過（草稿可有可無）", () => {
    assert.deepEqual(
      checkSourceCoverage({ ...base, sourceIds: ["a", "b"] }),
      [],
    );
    assert.deepEqual(
      checkSourceCoverage({ ...base, sourceIds: ["a", "b", "draft"] }),
      [],
    );
  });

  it("公開菜譜缺來源紀錄時指出菜譜", () => {
    const issues = checkSourceCoverage({ ...base, sourceIds: ["a"] });
    assert.equal(issues.length, 1);
    assert.equal(issues[0]?.recipe, "b");
  });

  it("孤兒紀錄指出檔案", () => {
    const issues = checkSourceCoverage({
      ...base,
      sourceIds: ["a", "b", "ghost"],
    });
    assert.equal(issues.length, 1);
    assert.equal(issues[0]?.file, "content/sources/ghost.yaml");
  });
});
