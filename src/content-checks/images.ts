import type { Issue } from "./issue.ts";
import type { Recipe } from "./recipes.ts";

export const IMAGE_WIDTH = 1536;
export const IMAGE_HEIGHT = 1024;
export const MAX_IMAGE_BYTES = 300 * 1024;

/** 圖片所屬的內容：問題會帶上這個識別欄位（菜譜、食材條目或專題）。 */
export type ImageOwner = Pick<Issue, "recipe" | "ingredient" | "topic">;

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

/** 替代文字描述圖中實際畫的內容，提到這些字就代表成品圖畫了餐具。 */
const UTENSIL_PATTERN = /筷|匙|叉|勺|調羹|餐刀/;

/** 成品圖只畫盛裝的盤或碗（規格見 06 票〈圖片風格規格〉）；步驟圖的餐具可能是做法的一部分，不檢查。 */
export function checkHeroAlt(owner: ImageOwner, ref: ImageRef): Issue[] {
  if (ref.field !== "hero" || !UTENSIL_PATTERN.test(ref.alt)) return [];
  return [
    {
      ...owner,
      field: ref.field,
      file: ref.src,
      message: "成品圖不畫餐具，替代文字卻提到餐具；重製圖片並改寫替代文字。",
    },
  ];
}

/** `info` 為 null 表示檔案不存在。 */
export function checkImageFile(
  owner: ImageOwner,
  ref: ImageRef,
  info: ImageFileInfo | null,
): Issue[] {
  const issue = (message: string): Issue => ({
    ...owner,
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
