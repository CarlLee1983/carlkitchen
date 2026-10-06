import { pathToFileURL } from "node:url";

const DEFAULT_RECIPES_DIR = "content/recipes";

/**
 * 內容集合 glob loader 的 base：相對路徑相對於專案根目錄；
 * 絕對路徑要轉成檔案 URL，否則拼成 `./` 開頭會變成指向錯誤位置的相對路徑，靜默產出空站。
 */
export function recipesLoaderBase(recipesDir: string): string | URL {
  const dir = recipesDir || DEFAULT_RECIPES_DIR;
  return dir.startsWith("/") ? pathToFileURL(dir) : `./${dir}`;
}
