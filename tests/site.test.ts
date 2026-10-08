import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { copyrightYears } from "../src/utils/site.ts";

describe("copyrightYears", () => {
  it("建站當年只顯示 2026", () => {
    assert.equal(copyrightYears(2026), "2026");
  });

  it("之後的年份顯示 2026 到當年的區間", () => {
    assert.equal(copyrightYears(2028), "2026–2028");
  });
});
