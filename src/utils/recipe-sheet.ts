interface FileShare {
  canShare?: (data: ShareData) => boolean;
  share?: (data: ShareData) => Promise<void>;
}

/** 必須由點擊事件直接呼叫，避免等待下載後失去手機瀏覽器的使用者啟用狀態。 */
export async function shareRecipeSheet(
  file: File | null,
  platform: FileShare,
): Promise<"shared" | "cancelled" | "unavailable" | "failed"> {
  if (!file || !platform.canShare || !platform.share) return "unavailable";
  const data = { files: [file] };
  try {
    if (!platform.canShare(data)) return "unavailable";
  } catch {
    return "unavailable";
  }
  try {
    await platform.share(data);
    return "shared";
  } catch (error) {
    return error instanceof DOMException && error.name === "AbortError"
      ? "cancelled"
      : "failed";
  }
}
