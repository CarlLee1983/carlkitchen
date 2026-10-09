import { shareRecipeSheet } from "../utils/recipe-sheet";

export function initRecipeSheet() {
  const button = document.querySelector<HTMLButtonElement>(
    ".share-recipe-sheet",
  );
  const download = document.querySelector<HTMLAnchorElement>(
    ".download-recipe-sheet",
  );
  const status = document.querySelector<HTMLElement>(".recipe-sheet-status");
  if (!button || !download || !status) return;

  let file: File | null = null;
  button.hidden = false;
  // 事先載入檔案；點擊時直接開分享選單，保留 Safari 所需的使用者啟用狀態。
  if (
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function"
  ) {
    button.disabled = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    fetch(download.href, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("圖片載入失敗");
        const blob = await response.blob();
        if (!blob.type.startsWith("image/")) throw new Error("圖片格式不符");
        file = new File([blob], download.download, { type: blob.type });
      })
      .catch(() => {
        file = null;
      })
      .finally(() => {
        window.clearTimeout(timeout);
        button.disabled = false;
      });
  }
  button.addEventListener("click", async () => {
    if (button.disabled) return;
    button.disabled = true;
    status.textContent = "";
    const result = await shareRecipeSheet(file, navigator);
    if (result === "unavailable" || result === "failed") {
      status.textContent =
        "無法直接分享圖片，請使用「下載圖片」，或開啟「查看菜單圖片」後長按儲存／分享。";
    }
    button.disabled = false;
  });
}
