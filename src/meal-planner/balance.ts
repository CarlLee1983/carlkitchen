import type { Candidate } from "./types.ts";

/** 至少一道蔬菜主角與「另一道」肉蛋料理；只讀組餐角色，不以瀏覽分類推算。 */
export function isBalanced(dishes: readonly Candidate[]): boolean {
  return dishes.some(
    (veg, i) =>
      veg.vegetable && dishes.some((other, j) => i !== j && other.protein),
  );
}
