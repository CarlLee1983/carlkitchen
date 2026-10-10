import type { APIRoute } from "astro";
import { buildPickData } from "../utils/random-picks-data";
import { getVisibleRecipes } from "../utils/recipes";

// 首頁隨機推薦的候選資料：建置時輸出成靜態檔，首頁在頁面載入後才抓取。
// 不是 HTML，不進 Pagefind 索引（索引只收 recipes／topics／solar-terms 的頁面）。
export const GET: APIRoute = async () =>
  new Response(JSON.stringify(await buildPickData(await getVisibleRecipes())), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
