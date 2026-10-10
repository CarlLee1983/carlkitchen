import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import test, { type TestContext } from "node:test";
import sharp from "sharp";

const script = resolve(".claude/skills/recipe-making/scripts/img.mjs");

function run(args: string[], env: Record<string, string> = {}, cwd?: string) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: "utf8",
    env: { ...process.env, ...env },
    cwd,
  });
}

function temporaryRoot(t: TestContext) {
  const root = mkdtempSync(join(tmpdir(), "img-webp-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

async function png(path: string, width: number, height: number) {
  await sharp({ create: { width, height, channels: 3, background: "#aabbcc" } })
    .png()
    .toFile(path);
}

async function fakeEncoder(root: string) {
  const bin = join(root, "bin");
  mkdirSync(bin);
  const good = join(root, "good.webp");
  const large = join(root, "large.webp");
  const data = await sharp({
    create: { width: 1536, height: 1024, channels: 3, background: "#aabbcc" },
  })
    .webp()
    .toBuffer();
  writeFileSync(good, data);
  writeFileSync(large, Buffer.concat([data, Buffer.alloc(307201)]));
  const encoder = join(root, "fake-cwebp.cjs");
  writeFileSync(
    encoder,
    `const fs = require("node:fs");
const path = require("node:path");
const args = process.argv.slice(2);
const source = args[args.indexOf("-o") - 1];
const target = args[args.indexOf("-o") + 1];
const q = Number(args[args.indexOf("-q") + 1]);
fs.appendFileSync(process.env.ENCODER_LOG, JSON.stringify({ source, target, q, args }) + "\\n");
if (path.basename(source).startsWith(process.env.FAIL_SOURCE || "\\0")) process.exit(7);
if (process.env.INVALID_WEBP) { fs.writeFileSync(target, "invalid"); process.exit(0); }
fs.copyFileSync(q > Number(process.env.GOOD_AT || 80) ? process.env.LARGE_WEBP : process.env.GOOD_WEBP, target);
`,
  );
  writeFileSync(
    join(bin, "cwebp"),
    `#!/bin/sh\nexec "${process.execPath}" "${encoder}" "$@"\n`,
    {
      mode: 0o755,
    },
  );
  return {
    PATH: `${bin}:${process.env.PATH}`,
    ENCODER_LOG: join(root, "calls.jsonl"),
    GOOD_WEBP: good,
    LARGE_WEBP: large,
  };
}

function calls(log: string) {
  return readFileSync(log, "utf8")
    .trim()
    .split("\n")
    .map(
      (line) =>
        JSON.parse(line) as {
          source: string;
          target: string;
          q: number;
          args: string[];
        },
    );
}

test("webp retries quality on direct 1536x1024 PNG and installs validated output", async (t) => {
  const root = temporaryRoot(t);
  const src = join(root, "a space.png");
  const out = join(root, "a space.webp");
  await png(src, 1536, 1024);
  const env = { ...(await fakeEncoder(root)), GOOD_AT: "70" };
  const result = run(["webp", src, out], env);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(
    calls(env.ENCODER_LOG).map(({ q }) => q),
    [80, 75, 70],
  );
  assert.ok(
    calls(env.ENCODER_LOG).every(
      ({ source, args }) =>
        source === src && args.includes("-m") && args.includes("-mt"),
    ),
  );
  assert.equal((await sharp(out).metadata()).format, "webp");
  assert.ok(
    readdirSync(root).filter((name) => name.startsWith(".a space.webp."))
      .length === 0,
  );
});

test("webp resizes nonstandard PNG once and preserves an existing target on failure", async (t) => {
  const root = temporaryRoot(t);
  const src = join(root, "odd.png");
  const out = join(root, "odd.webp");
  await png(src, 500, 500);
  writeFileSync(out, "original");
  const env = { ...(await fakeEncoder(root)), GOOD_AT: "0" };
  const result = run(["webp", src, out], env);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /odd\.png|odd\.webp/);
  assert.equal(readFileSync(out, "utf8"), "original");
  const attempts = calls(env.ENCODER_LOG);
  assert.deepEqual(
    attempts.map(({ q }) => q),
    [80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30],
  );
  assert.equal(new Set(attempts.map(({ source }) => source)).size, 1);
  assert.ok(attempts[0]);
  assert.notEqual(attempts[0].source, src);
  assert.deepEqual(readdirSync(root).sort(), [
    "bin",
    "calls.jsonl",
    "fake-cwebp.cjs",
    "good.webp",
    "large.webp",
    "odd.png",
    "odd.webp",
  ]);
});

test("webp-batch converts top-level PNGs in name order and stops at the failing file", async (t) => {
  const root = temporaryRoot(t);
  const srcDir = join(root, "source");
  const outDir = join(root, "output");
  mkdirSync(srcDir);
  mkdirSync(outDir);
  for (const name of ["c.png", "a.png", "b.png"])
    await png(join(srcDir, name), 1536, 1024);
  const env = { ...(await fakeEncoder(root)), FAIL_SOURCE: "b.png" };
  const result = run(["webp-batch", srcDir, outDir], env);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /b\.png/);
  assert.deepEqual(
    calls(env.ENCODER_LOG).map(({ source }) => basename(source)),
    ["a.png", "b.png"],
  );
  assert.deepEqual(readdirSync(outDir), ["a.webp"]);
});

test("webp-batch rejects an empty PNG set and webp explains a missing cwebp", async (t) => {
  const root = temporaryRoot(t);
  const srcDir = join(root, "source");
  mkdirSync(srcDir);
  const empty = run(["webp-batch", srcDir, join(root, "out")]);
  assert.notEqual(empty.status, 0);
  assert.match(empty.stderr, /PNG|png/);
  const src = join(root, "image.png");
  await png(src, 1536, 1024);
  const missing = run(["webp", src, join(root, "image.webp")], { PATH: root });
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /brew install webp/);
  assert.match(missing.stderr, /apt-get install webp/);
});

test("installed cwebp produces a valid 1536x1024 WebP", async (t) => {
  assert.equal(
    spawnSync("cwebp", ["-version"]).status,
    0,
    "cwebp must be installed",
  );
  assert.equal(
    spawnSync("dwebp", ["-version"]).status,
    0,
    "dwebp must be installed",
  );
  const root = temporaryRoot(t);
  const src = join(root, "real.png");
  const out = join(root, "real.webp");
  await png(src, 800, 600);
  const result = run(["webp", src, out]);
  assert.equal(result.status, 0, result.stderr);
  const meta = await sharp(out).metadata();
  assert.deepEqual(
    [meta.format, meta.width, meta.height],
    ["webp", 1536, 1024],
  );
  assert.ok(readFileSync(out).length <= 307200);
});

test("malformed encoder output preserves the existing target and removes temporary files", async (t) => {
  const root = temporaryRoot(t);
  const src = join(root, "bad.png");
  const out = join(root, "bad.webp");
  await png(src, 1536, 1024);
  writeFileSync(out, "original");
  const env = { ...(await fakeEncoder(root)), INVALID_WEBP: "1" };
  const result = run(["webp", src, out], env);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /bad\.png/);
  assert.equal(readFileSync(out, "utf8"), "original");
  assert.ok(readdirSync(root).every((name) => !name.startsWith(".bad.webp.")));
});

test("decoder failure preserves the target and removes temporary files", async (t) => {
  const root = temporaryRoot(t);
  const src = join(root, "decode.png");
  const out = join(root, "decode.webp");
  await png(src, 1536, 1024);
  writeFileSync(out, "original");
  const env = await fakeEncoder(root);
  writeFileSync(join(root, "bin", "dwebp"), "#!/bin/sh\nexit 9\n", {
    mode: 0o755,
  });
  const result = run(["webp", src, out], env);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /decode\.png/);
  assert.equal(readFileSync(out, "utf8"), "original");
  assert.ok(
    readdirSync(root).every((name) => !name.startsWith(".decode.webp.")),
  );
});

test("missing dwebp reports the WebP package install hint", async (t) => {
  const root = temporaryRoot(t);
  const src = join(root, "decode.png");
  await png(src, 1536, 1024);
  const env = await fakeEncoder(root);
  const result = run(["webp", src, join(root, "decode.webp")], {
    ...env,
    PATH: join(root, "bin"),
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /dwebp/);
  assert.match(result.stderr, /brew install webp/);
  assert.match(result.stderr, /apt-get install webp/);
});

test("installed cwebp accepts a relative PNG filename beginning with a hyphen", async (t) => {
  const root = temporaryRoot(t);
  await png(join(root, "-leading.png"), 1536, 1024);
  const result = run(["webp", "-leading.png", "result.webp"], {}, root);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    (await sharp(join(root, "result.webp")).metadata()).format,
    "webp",
  );
});
