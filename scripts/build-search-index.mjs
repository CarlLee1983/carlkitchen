// 建置後以 Pagefind 為已發布菜譜頁、專題頁與節氣總覽頁建立搜尋索引，並在 dist/index.html 注入 LCP 圖片 preload。
// 只收 recipes/、topics/、solar-terms/ 底下的頁面：正式內容為空時，Pagefind 預設會改為索引全站，
// 但沒有任何這類頁面時 `--glob` 又會讓它因「沒有 HTML」而失敗，所以沒有就略過。
// 這些頁面都以 data-pagefind-body 標記可搜尋範圍，專題列表頁沒有標記所以不進索引。

import { execFileSync } from "node:child_process";
import {
  existsSync,
  globSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const SITE = "dist";
const GLOBS = [
  "recipes/**/*.html",
  "topics/**/*.html",
  "solar-terms/**/*.html",
];

if (!existsSync(SITE)) {
  console.error(`找不到 ${SITE}，請先執行 astro build。`);
  process.exit(1);
}

if (GLOBS.every((glob) => globSync(glob, { cwd: SITE }).length === 0)) {
  console.log("沒有菜譜頁、專題頁或節氣總覽頁，略過 Pagefind 索引。");
} else {
  // 沿用 pnpm 腳本環境的 PATH 找到 pagefind；失敗時直接讓建置失敗。
  execFileSync("pagefind", ["--site", SITE, "--glob", `{${GLOBS.join(",")}}`], {
    stdio: "inherit",
  });

  // Pagefind 預設輸出預製的搜尋 UI 套件（含舊版 ES5 相容 helper 如 classCallCheck）。
  // 本站首頁直接以原生動態 import 使用 pagefind.js / pagefind-worker.js 與 wasm 核心 API，
  // 不使用任何 Pagefind 預製 UI 產物。清理多餘檔案可減少部署體積並消除「避免提供舊版 JavaScript」警告。
  const UNUSED_PAGEFIND_UI = [
    "pagefind/pagefind-ui.js",
    "pagefind/pagefind-ui.css",
    "pagefind/pagefind-modular-ui.js",
    "pagefind/pagefind-modular-ui.css",
    "pagefind/pagefind-component-ui.js",
    "pagefind/pagefind-component-ui.css",
    "pagefind/pagefind-highlight.js",
  ];
  for (const file of UNUSED_PAGEFIND_UI) {
    const filePath = join(SITE, file);
    if (existsSync(filePath)) {
      rmSync(filePath);
    }
  }
}

// Lighthouse LCP Request Discovery 優化：
// 從 dist/index.html 的 noscript 擷取預設首圖的 src、srcset 與 sizes，在 <head> 注入 <link rel="preload">。
const indexPath = join(SITE, "index.html");
if (existsSync(indexPath)) {
  const html = readFileSync(indexPath, "utf8");
  const noscriptImg = html.match(
    /<noscript>[\s\S]*?<img([^>]+)>[\s\S]*?<\/noscript>/,
  );
  if (noscriptImg && !html.includes('rel="preload" as="image"')) {
    const attrs = noscriptImg[1];
    if (attrs) {
      const src = attrs.match(/src="([^"]+)"/)?.[1];
      const srcset = attrs.match(/srcset="([^"]+)"/)?.[1];
      const sizes = attrs.match(/sizes="([^"]+)"/)?.[1];
      if (src && srcset && sizes) {
        const preloadTag = `<link rel="preload" as="image" href="${src}" imagesrcset="${srcset}" imagesizes="${sizes}" fetchpriority="high">`;
        const injected = html.replace("</head>", `${preloadTag}</head>`);
        writeFileSync(indexPath, injected, "utf8");
        console.log("已在 dist/index.html 注入 LCP 圖片預載宣告。");
      }
    }
  }
}
