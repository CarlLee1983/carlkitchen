import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { satteri } from "@astrojs/markdown-satteri";
import { topicMarkdown } from "./src/markdown/topic-markdown.ts";

/** @param {string} page */
const publicPage = (page) => {
  const path = new URL(page).pathname;
  return (
    [
      "/",
      "/about/",
      "/meal/",
      "/ingredients/",
      "/topics/",
      "/solar-terms/",
    ].includes(path) ||
    /^\/(?:recipes|ingredients|topics)\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/.test(path)
  );
};

export default defineConfig({
  site: "https://carlkitchen.gravito.dev",
  output: "static",
  trailingSlash: "always",
  // 預設輸出到 dist；e2e 的配菜站台以 ASTRO_OUT_DIR 另建，避免覆蓋正式輸出。
  outDir: process.env.ASTRO_OUT_DIR ?? "dist",
  // 圖片一律輸出響應式 srcset／sizes；母檔 1536 寬，Astro 依斷點產生較小尺寸。
  // WebP 品質 70：插畫在 70 與 sharp 預設 80 肉眼難辨，檔案小約兩成（PageSpeed「提升圖片傳送效能」）。
  image: {
    layout: "constrained",
    service: {
      entrypoint: "astro/assets/services/sharp",
      config: { webp: { quality: 70 } },
    },
  },
  // CSS 一律內嵌：每頁樣式只有數 KB，外部檔換來的快取效益抵不過首屏多一個阻擋繪製的請求（PageSpeed render-blocking）。
  build: { inlineStylesheets: "always" },
  vite: {
    build: {
      // 現代基準（Baseline）：避免轉譯已在所有現代瀏覽器原生支援的語法，消除冗餘 polyfill 與 helper。
      target: "es2022",
    },
  },
  markdown: {
    processor: satteri({
      hastPlugins: [
        topicMarkdown({
          topicsDir: process.env.TOPICS_DIR || "content/topics",
        }),
      ],
    }),
  },
  integrations: [sitemap({ filter: publicPage })],
});
