import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { APIRoute } from "astro";
import sharp from "sharp";
import { parse } from "yaml";
import { getVisibleRecipes, type Recipe } from "../../../utils/recipes";

export async function getStaticPaths() {
  return (await getVisibleRecipes())
    .filter((recipe) => recipe.data.hero)
    .map((recipe) => ({ params: { id: recipe.id }, props: { recipe } }));
}

export const GET: APIRoute = async ({ props }) => {
  const recipe = props.recipe as Recipe;
  const source = parse(await readFile(recipe.filePath!, "utf8")) as {
    hero: { src: string };
  };
  const heroPath = resolve(dirname(recipe.filePath!), source.hero.src);
  // 原圖為 3:2；以留白保留料理全貌，避免 1200×630 的社群卡片裁掉邊緣。
  const image = await sharp(heroPath)
    .resize(1200, 630, { fit: "contain", background: "#f7f6f3" })
    .webp({ quality: 85 })
    .toBuffer();
  return new Response(new Uint8Array(image), {
    headers: { "Content-Type": "image/webp" },
  });
};
