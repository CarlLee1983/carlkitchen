import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://carlkitchen.gravito.dev",
  output: "static",
  trailingSlash: "always",
  // 圖片一律輸出響應式 srcset／sizes；母檔 1536 寬，Astro 依斷點產生較小尺寸。
  image: { layout: "constrained" },
});
