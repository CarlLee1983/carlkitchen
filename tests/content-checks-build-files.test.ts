import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import { gzipSync } from "node:zlib";
import { collectBuildFiles } from "../src/content-checks/io.ts";

const root = mkdtempSync(join(tmpdir(), "build-files-"));
after(() => rmSync(root, { recursive: true, force: true }));

describe("collectBuildFiles", () => {
  it("讀取文字檔、解開 Pagefind 碎片，二進位檔只留路徑", () => {
    mkdirSync(join(root, "pagefind/fragment"), { recursive: true });
    writeFileSync(join(root, "index.html"), "<p>首頁</p>");
    writeFileSync(
      join(root, "pagefind/fragment/zh_abc.pf_fragment"),
      gzipSync('pagefind_dcd{"url":"/recipes/x/"}'),
    );
    writeFileSync(join(root, "logo.webp"), Buffer.from([1, 2, 3]));

    const files = Object.fromEntries(
      collectBuildFiles(root).map((file) => [file.path, file.text]),
    );
    assert.equal(files["index.html"], "<p>首頁</p>");
    assert.match(
      files["pagefind/fragment/zh_abc.pf_fragment"]!,
      /\/recipes\/x\//,
    );
    assert.equal(files["logo.webp"], "");
  });
});
