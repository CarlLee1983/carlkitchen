import type { ImageMetadata } from "astro";
import { solarTermArt, type SolarTermName } from "./solar-terms";

const art = import.meta.glob<{ default: ImageMetadata }>(
  "../assets/solar-terms/*.webp",
  { eager: true },
);

/** 節氣插畫與替代文字（「<節氣>節氣插畫」），首頁與節氣總覽共用。 */
export function solarTermIllustration(name: SolarTermName) {
  const image = art[`../assets/solar-terms/${solarTermArt[name]}.webp`];
  if (!image) throw new Error(`節氣「${name}」缺少插畫`);
  return { src: image.default, alt: `${name}節氣插畫` };
}
