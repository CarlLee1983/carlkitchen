import type { Locator } from "@playwright/test";

/**
 * 量出 img 的 sizes 在目前視窗下算出的槽寬與實際顯示寬度。
 * 依序比對各條件，取第一個符合的長度（沒有條件的最後一項為預設），
 * 再用同樣的 CSS 長度撐開探針元素換算成像素，與瀏覽器挑 srcset 的依據一致。
 */
export const sizesSlot = (img: Locator) =>
  img.evaluate((el: HTMLImageElement) => {
    // 只在括號外的逗號切開，calc()／min() 內的逗號不算分隔。
    const entries: string[] = [];
    let depth = 0;
    let current = "";
    for (const char of el.sizes) {
      if (char === "(") depth++;
      if (char === ")") depth--;
      if (char === "," && depth === 0) {
        entries.push(current.trim());
        current = "";
      } else current += char;
    }
    entries.push(current.trim());
    const length =
      entries
        .map((entry) => {
          const [, media, value] = entry.match(/^(\(.+?\))\s+(.+)$/) ?? [];
          if (!media || !value) return entry;
          return matchMedia(media).matches ? value : null;
        })
        .find((value) => value !== null) ?? "100vw";
    // 解析錯的長度會被 style.width 默默忽略、探針退回 body 寬，量測就失真，直接報錯。
    if (!CSS.supports("width", length)) {
      throw new Error(`無法解析 sizes：${el.sizes}（取得 ${length}）`);
    }
    const probe = document.createElement("div");
    probe.style.width = length;
    document.body.append(probe);
    const slot = probe.getBoundingClientRect().width;
    probe.remove();
    return { slot, rendered: el.getBoundingClientRect().width };
  });
