// 在暫時 worktree 把目前 HEAD 與 origin/main 合併後跑 CI 的檢查，抓「分支本身全綠、合併後才壞」的情況
// （例如分支收緊 schema，而 main 同時新增了不符新規則的菜譜）。工作目錄與分支都不會被改動。
// 用法：pnpm check:merge [--e2e]；加 --e2e 另跑瀏覽器測試（port 以 E2E_PORT_BASE 錯開，預設 4521）。
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const withE2e = process.argv.includes("--e2e");
const git = (...args: string[]) =>
  execFileSync("git", args, { encoding: "utf8", stdio: "pipe" }).trim();

git("fetch", "--quiet", "origin", "main");
const dir = mkdtempSync(join(tmpdir(), "carlkitchen-merge-"));
git("worktree", "add", "--quiet", "--detach", dir, "HEAD");

let failed = false;
try {
  const merge = spawnSync(
    "git",
    ["merge", "--no-edit", "--quiet", "origin/main"],
    { cwd: dir, stdio: "inherit" },
  );
  if (merge.status !== 0)
    throw new Error("與 origin/main 合併有衝突，先解衝突。");

  const steps = [
    ["install", "--frozen-lockfile", "--prefer-offline"],
    ["check"],
    ["check:content"],
    ["test"],
    ...(withE2e ? [["test:e2e"]] : []),
  ];
  for (const step of steps) {
    console.log(`\n【合併檢查】pnpm ${step.join(" ")}（已合併 origin/main）`);
    const result = spawnSync("pnpm", step, {
      cwd: dir,
      stdio: "inherit",
      env: { E2E_PORT_BASE: "4521", ...process.env },
    });
    if (result.status !== 0) {
      failed = true;
      break;
    }
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  failed = true;
} finally {
  git("worktree", "remove", "--force", dir);
  rmSync(dir, { recursive: true, force: true });
}

console.log(failed ? "\n合併後檢查失敗。" : "\n合併後檢查通過。");
process.exit(failed ? 1 : 0);
