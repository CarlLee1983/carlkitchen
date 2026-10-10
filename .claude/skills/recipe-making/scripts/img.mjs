// 插畫轉檔工具，sharp 取自專案依賴。
//   node img.mjs preview <png>                 產生 <png 同名>.preview.jpg（寬 768）供目視檢查
//   node img.mjs webp <png> <out.webp>         轉成 1536×1024、不超過 300 KB 的 WebP
//   node img.mjs webp-batch <來源資料夾> <輸出資料夾>  依檔名順序轉換最上層 PNG；失敗時保留先前完成的檔案
//   node img.mjs sheet <菜譜資料夾> <out.jpg>  把該菜譜全部 WebP 排成一張縮圖總表
//   node img.mjs steps [關鍵字]                列出每道菜各步驟有沒有圖（■ 有、□ 缺）；給關鍵字只列文字含該字的步驟
// 菜譜目錄取 RECIPES_DIR，預設 content/recipes。
import { execFile } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
} from "node:fs";
import { devNull } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";
import { parse } from "yaml";

const WIDTH = 1536;
const HEIGHT = 1024;
const MAX_BYTES = 300 * 1024;
const execFileAsync = promisify(execFile);

const [mode, src, out] = process.argv.slice(2);

async function preview(png) {
  const meta = await sharp(png).metadata();
  console.log(`${png}: ${meta.width}x${meta.height} ${meta.format}`);
  await sharp(png)
    .resize({ width: 768 })
    .jpeg({ quality: 80 })
    .toFile(png.replace(/\.png$/, ".preview.jpg"));
}

async function toWebp(png, target) {
  sharp.cache(false);
  const tempDir = mkdtempSync(join(dirname(target), `.${basename(target)}.`));
  try {
    const meta = await sharp(png).metadata();
    let input = resolve(png);
    if (meta.width !== WIDTH || meta.height !== HEIGHT) {
      input = resolve(tempDir, "input.png");
      await sharp(png)
        .resize(WIDTH, HEIGHT, { fit: "cover" })
        .png()
        .toFile(input);
    }
    const output = resolve(tempDir, "output.webp");
    for (let quality = 80; quality >= 30; quality -= 5) {
      try {
        await execFileAsync("cwebp", [
          "-q",
          String(quality),
          "-m",
          "4",
          "-mt",
          input,
          "-o",
          output,
        ]);
      } catch (error) {
        if (error.code === "ENOENT") {
          throw new Error(
            "找不到 cwebp；請安裝：brew install webp 或 apt-get install webp",
          );
        }
        throw error;
      }
      const bytes = statSync(output).size;
      if (bytes <= MAX_BYTES) {
        const result = await sharp(output).metadata();
        if (
          result.format !== "webp" ||
          result.width !== WIDTH ||
          result.height !== HEIGHT
        ) {
          throw new Error(`${png} 產生的 WebP 格式或尺寸不正確`);
        }
        try {
          await execFileAsync("dwebp", [output, "-ppm", "-o", devNull]);
        } catch (error) {
          if (error.code === "ENOENT") {
            throw new Error(
              "找不到 dwebp；請安裝：brew install webp 或 apt-get install webp",
            );
          }
          throw error;
        }
        renameSync(output, target);
        console.log(`${target}: q=${quality} ${bytes} bytes`);
        return;
      }
    }
    throw new Error(`${png} 壓到品質 30 仍超過 300 KB`);
  } catch (error) {
    throw new Error(`${png}: ${error.message}`, { cause: error });
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

async function toWebpBatch(sourceDir, outputDir) {
  const files = readdirSync(sourceDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.png$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort();
  if (files.length === 0) throw new Error(`${sourceDir} 沒有 PNG 檔案`);
  mkdirSync(outputDir, { recursive: true });
  for (const file of files) {
    await toWebp(
      join(sourceDir, file),
      join(outputDir, file.replace(/\.png$/i, ".webp")),
    );
  }
}

async function sheet(dir, target) {
  const tile = { width: 480, height: 320 };
  const files = readdirSync(dir)
    .filter((file) => file.endsWith(".webp"))
    .sort((a, b) => order(a) - order(b) || a.localeCompare(b));
  const columns = 3;
  const rows = Math.ceil(files.length / columns);
  const tiles = await Promise.all(
    files.map((file) => sharp(join(dir, file)).resize(tile).toBuffer()),
  );
  await sharp({
    create: {
      width: columns * tile.width,
      height: rows * tile.height,
      channels: 3,
      background: "#fff",
    },
  })
    .composite(
      tiles.map((input, index) => ({
        input,
        left: (index % columns) * tile.width,
        top: Math.floor(index / columns) * tile.height,
      })),
    )
    .jpeg({ quality: 75 })
    .toFile(target);
  console.log(`${target}: ${files.join(", ")}`);
}

function steps(keyword) {
  const root = process.env.RECIPES_DIR ?? "content/recipes";
  const ids = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  for (const id of ids) {
    const recipe = parse(readFileSync(join(root, id, "recipe.yaml"), "utf8"));
    const marks = recipe.steps
      .map((step, index) => ({ step, number: index + 1 }))
      .filter(({ step }) => !keyword || step.text.includes(keyword))
      .map(({ step, number }) =>
        keyword
          ? `${number}${step.image ? "■" : "□"} ${step.text}`
          : `${number}${step.image ? "■" : "□"}`,
      );
    if (marks.length === 0) continue;
    console.log(
      keyword
        ? `${id}\n  ${marks.join("\n  ")}`
        : `${id.padEnd(30)} ${marks.join(" ")}`,
    );
  }
}

// 總表順序：成品圖、材料合照、步驟圖
function order(file) {
  if (file.startsWith("hero")) return 0;
  if (file.startsWith("ingredients")) return 1;
  return 2;
}

const modes = {
  preview: () => preview(src),
  webp: () => toWebp(src, out),
  "webp-batch": () => toWebpBatch(src, out),
  sheet: () => sheet(src, out),
  steps: () => steps(src),
};
const needs = {
  preview: [src],
  webp: [src, out],
  "webp-batch": [src, out],
  sheet: [src, out],
  steps: [],
};
if (!modes[mode] || needs[mode].some((arg) => !arg)) {
  console.error(
    "用法：node img.mjs preview <png> | webp <png> <out.webp> | webp-batch <來源資料夾> <輸出資料夾> | sheet <菜譜資料夾> <out.jpg> | steps [關鍵字]",
  );
  process.exit(1);
}
await modes[mode]();
