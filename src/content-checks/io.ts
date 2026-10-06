import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { gunzipSync } from "node:zlib";
import sharp from "sharp";
import { parse } from "yaml";
import type { ImageFileInfo } from "./images.ts";
import type { BuildFile } from "./leaks.ts";

/** 讀成文字掃描的副檔名；Pagefind 碎片另外嘗試 gunzip。 */
const TEXT_EXTENSIONS = new Set([
  ".html",
  ".js",
  ".mjs",
  ".json",
  ".css",
  ".txt",
  ".xml",
  ".svg",
  ".map",
  ".webmanifest",
]);
const PAGEFIND_EXTENSIONS = new Set([
  ".pf_fragment",
  ".pf_index",
  ".pf_meta",
  ".pf_filter",
]);

/** 目錄下每個子資料夾的識別值；不存在時回傳 null。 */
export function listDirectories(dir: string): string[] | null {
  if (!existsSync(dir)) return null;
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

/** 讀取 YAML 檔；缺檔回傳 undefined，語法錯誤時丟出附檔名的錯誤。 */
export function readYaml(file: string): unknown {
  if (!existsSync(file)) return undefined;
  try {
    return parse(readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`YAML 無法解析：${(error as Error).message}`, {
      cause: error,
    });
  }
}

/** 來源目錄中的 `<識別值>.yaml`；不存在時視為空。 */
export function listSourceIds(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".yaml"))
    .map((name) => name.slice(0, -".yaml".length))
    .sort();
}

export async function readImageInfo(
  file: string,
): Promise<ImageFileInfo | null> {
  if (!existsSync(file)) return null;
  const bytes = statSync(file).size;
  try {
    const { format, width, height } = await sharp(file).metadata();
    return { format, width, height, bytes };
  } catch {
    // 不是可解碼的圖片：回報成無法辨識的格式，而不是中斷整個檢查。
    return { bytes };
  }
}

function extension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot);
}

function readBuildText(file: string): string | null {
  const ext = extension(file);
  if (TEXT_EXTENSIONS.has(ext)) return readFileSync(file, "utf8");
  if (PAGEFIND_EXTENSIONS.has(ext)) {
    const raw = readFileSync(file);
    try {
      return gunzipSync(raw).toString("utf8");
    } catch {
      // 非 gzip 的碎片就當原始位元組掃描。
      return raw.toString("latin1");
    }
  }
  return null;
}

/** 遞迴收集建置輸出中可掃描的檔案（圖片等二進位檔只以路徑參與檢查）。 */
export function collectBuildFiles(distDir: string): BuildFile[] {
  const files: BuildFile[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      const path = relative(distDir, full).split(sep).join("/");
      files.push({ path, text: readBuildText(full) ?? "" });
    }
  };
  walk(distDir);
  return files;
}
