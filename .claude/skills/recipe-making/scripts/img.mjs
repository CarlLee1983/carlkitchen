// 插畫轉檔工具，sharp 取自專案依賴。
//   node img.mjs preview <png>                 產生 <png 同名>.preview.jpg（寬 768）供目視檢查
//   node img.mjs webp <png> <out.webp>         轉成 1536×1024、不超過 300 KB 的 WebP
//   node img.mjs sheet <菜譜資料夾> <out.jpg>  把該菜譜全部 WebP 排成一張縮圖總表
//   node img.mjs steps [關鍵字]                列出每道菜各步驟有沒有圖（■ 有、□ 缺）；給關鍵字只列文字含該字的步驟
// 菜譜目錄取 RECIPES_DIR，預設 content/recipes。
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { parse } from "yaml";

const WIDTH = 1536;
const HEIGHT = 1024;
const MAX_BYTES = 300 * 1024;

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
  for (let quality = 80; quality >= 30; quality -= 5) {
    const buffer = await sharp(png)
      .resize(WIDTH, HEIGHT, { fit: "cover" })
      .webp({ quality })
      .toBuffer();
    if (buffer.length <= MAX_BYTES) {
      writeFileSync(target, buffer);
      console.log(`${target}: q=${quality} ${buffer.length} bytes`);
      return;
    }
  }
  throw new Error(`${png} 壓到品質 30 仍超過 300 KB`);
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
  sheet: () => sheet(src, out),
  steps: () => steps(src),
};
const needs = {
  preview: [src],
  webp: [src, out],
  sheet: [src, out],
  steps: [],
};
if (!modes[mode] || needs[mode].some((arg) => !arg)) {
  console.error(
    "用法：node img.mjs preview <png> | webp <png> <out.webp> | sheet <菜譜資料夾> <out.jpg> | steps [關鍵字]",
  );
  process.exit(1);
}
await modes[mode]();
