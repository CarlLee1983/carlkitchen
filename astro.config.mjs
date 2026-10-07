import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { satteri } from "@astrojs/markdown-satteri";
import { topicMarkdown } from "./src/markdown/topic-markdown.ts";

/** @param {string} page */
const publicPage = (page) => {
  const path = new URL(page).pathname;
  return (
    ["/", "/about/", "/meal/", "/ingredients/", "/topics/"].includes(path) ||
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
  image: { layout: "constrained" },
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
