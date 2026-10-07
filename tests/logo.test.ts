import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { test } from "node:test";
import sharp from "sharp";

const size = 16;
const outputDir = new URL("../test-results/", import.meta.url);

function contrastingEdges(data: Buffer, channels: number): number {
  const luminance = (offset: number) =>
    0.2126 * data.readUInt8(offset) +
    0.7152 * data.readUInt8(offset + 1) +
    0.0722 * data.readUInt8(offset + 2);
  let edges = 0;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const offset = (y * size + x) * channels;
      if (
        x < size - 1 &&
        Math.abs(luminance(offset) - luminance(offset + channels)) > 70
      ) {
        edges++;
      }
      if (
        y < size - 1 &&
        Math.abs(luminance(offset) - luminance(offset + size * channels)) > 70
      ) {
        edges++;
      }
    }
  }

  return edges;
}

test("16px Logo 在明暗頁籤背景有可見輪廓", async () => {
  const source = await readFile(
    new URL("../public/logo-mark.svg", import.meta.url),
  );
  const icon = await sharp(source).resize(size, size).png().toBuffer();
  await mkdir(outputDir, { recursive: true });

  for (const [mode, background] of [
    ["light", "#f7f6f3"],
    ["dark", "#202124"],
  ] as const) {
    const preview = await sharp({
      create: { width: size, height: size, channels: 4, background },
    })
      .composite([{ input: icon }])
      .png()
      .toBuffer();
    await writeFile(new URL(`logo-favicon-16-${mode}.png`, outputDir), preview);

    const { data, info } = await sharp(preview)
      .raw()
      .toBuffer({ resolveWithObject: true });
    // 無米白底的舊版在深色背景只有 8 條高對比邊緣，盤形幾乎消失。
    assert.ok(
      contrastingEdges(data, info.channels) >= 30,
      `${mode} 背景下的 16px Logo 輪廓對比不足`,
    );
  }
});
