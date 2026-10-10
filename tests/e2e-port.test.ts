import assert from "node:assert/strict";
import { test } from "node:test";
import { findPortBase } from "../scripts/e2e-port.mjs";

// 以「被占用的 port 集合」模擬可否綁定的檢查
const freeExcept = (busy: number[]) => async (port: number) =>
  !busy.includes(port);

test("全部可用時回傳起點 4321", async () => {
  assert.equal(await findPortBase(freeExcept([])), 4321);
});

test("起點三個 port 任一被占，跳到下一組", async () => {
  assert.equal(await findPortBase(freeExcept([4321])), 4331);
  assert.equal(await findPortBase(freeExcept([4322])), 4331);
  assert.equal(await findPortBase(freeExcept([4323])), 4331);
});

test("連續多組被占時繼續往上找", async () => {
  assert.equal(await findPortBase(freeExcept([4321, 4333])), 4341);
});

test("全被占用時丟出錯誤", async () => {
  await assert.rejects(
    findPortBase(async () => false),
    /找不到/,
  );
});
