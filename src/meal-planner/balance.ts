import type { Candidate } from "./types.ts";

/** 至少一道蔬菜與「另一道」肉蛋料理；同一道雙標記菜不能獨自滿足兩項。 */
export function isBalanced(dishes: readonly Candidate[]): boolean {
  return dishes.some(
    (veg, i) =>
      veg.vegetable && dishes.some((other, j) => i !== j && other.protein),
  );
}
