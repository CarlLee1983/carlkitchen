import { getImage } from "astro:assets";
import { recipeKindLabels, recipeKinds } from "./home";
import { PICK_SIZES } from "./random-picks";
import { CARD_IMAGE_WIDTHS } from "./recipe-card";
import { recipeHref, type Recipe } from "./recipes";

/** 候選一道菜的資料；形狀由 `src/scripts/home-picks.ts` 讀取，兩處要同步。 */
export interface PickItem {
  id: string;
  href: string;
  title: string;
  kinds: string[];
  /** 料理主角標籤文字（同清單列與菜譜頁）。 */
  labels: string[];
  alt: string;
  src: string;
  srcset: string;
  width: number;
  height: number;
  /** Astro 圖片的 data-astro-image* 屬性（響應式版面用）。 */
  extra: Record<string, string>;
}
export interface PickData {
  sizes: string;
  items: PickItem[];
}

/** 候選：呼叫端給的可見菜譜中有成品圖者（與首頁大圖同條件）。圖片網址與 srcset 在建置時算好。 */
export async function buildPickData(recipes: Recipe[]): Promise<PickData> {
  const withHero = recipes.filter((recipe) => recipe.data.hero);
  const items = await Promise.all(
    withHero.map(async (recipe): Promise<PickItem> => {
      const hero = recipe.data.hero!;
      const image = await getImage({
        src: hero.src,
        widths: CARD_IMAGE_WIDTHS,
        sizes: PICK_SIZES,
        fit: "cover", // 與 <Image> 的預設一致，帶出 data-astro-image-fit
      });
      return {
        id: recipe.id,
        href: recipeHref(recipe),
        title: recipe.data.title,
        kinds: recipeKinds(recipe.data),
        labels: recipeKindLabels(recipe.data),
        alt: hero.alt,
        src: image.src,
        srcset: image.srcSet.attribute,
        width: image.attributes.width,
        height: image.attributes.height,
        extra: Object.fromEntries(
          Object.entries(image.attributes).filter(([key]) =>
            key.startsWith("data-astro-image"),
          ),
        ),
      };
    }),
  );
  return { sizes: PICK_SIZES, items };
}
