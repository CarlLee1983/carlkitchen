import type { Issue } from "./issue.ts";
import type { Recipe } from "./recipes.ts";

export const IMAGE_WIDTH = 1536;
export const IMAGE_HEIGHT = 1024;
export const MAX_IMAGE_BYTES = 300 * 1024;

export interface ImageRef {
  /** 圖片在菜譜中的欄位路徑。 */
  field: string;
  /** YAML 中的相對路徑。 */
  src: string;
  alt: string;
}

export interface ImageFileInfo {
  format?: string;
  width?: number;
  height?: number;
  bytes: number;
}

/** 列出菜譜引用的每一張圖；必要圖片是否齊全與替代文字是否填寫由 schema 保證。 */
export function collectImageRefs(recipe: Recipe): ImageRef[] {
  const refs: ImageRef[] = [];
  const add = (field: string, image?: { src: string; alt: string }) => {
    if (image) refs.push({ field, src: image.src, alt: image.alt });
  };
  add("hero", recipe.hero);
  add("ingredientsPhoto", recipe.ingredientsPhoto);
  recipe.ingredients.forEach((item, i) =>
    add(`ingredients.${i}.image`, item.image),
  );
  recipe.steps.forEach((step, i) => add(`steps.${i}.image`, step.image));
  return refs;
}

/** `info` 為 null 表示檔案不存在。 */
export function checkImageFile(
  id: string,
  ref: ImageRef,
  info: ImageFileInfo | null,
): Issue[] {
  const issue = (message: string): Issue => ({
    recipe: id,
    field: ref.field,
    file: ref.src,
    message,
  });
  if (!info) return [issue("找不到圖片檔。")];

  const issues: Issue[] = [];
  if (info.format !== "webp") {
    issues.push(
      issue(`圖片必須是 WebP，實際為 ${info.format ?? "無法辨識"}。`),
    );
  }
  if (info.width !== IMAGE_WIDTH || info.height !== IMAGE_HEIGHT) {
    issues.push(
      issue(
        `圖片尺寸必須是 ${IMAGE_WIDTH}×${IMAGE_HEIGHT}，實際為 ${info.width ?? "?"}×${info.height ?? "?"}。`,
      ),
    );
  }
  if (info.bytes > MAX_IMAGE_BYTES) {
    issues.push(
      issue(
        `圖片不得超過 ${MAX_IMAGE_BYTES / 1024} KB，實際為 ${Math.ceil(info.bytes / 1024)} KB。`,
      ),
    );
  }
  return issues;
}
