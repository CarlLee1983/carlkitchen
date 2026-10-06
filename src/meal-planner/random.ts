/**
 * 可重現的小型 PRNG（mulberry32）。狀態就是 32 位元種子，
 * 每取一個亂數就推進一步，`seed` 讀出的值可直接當作下一個 `Plan.seed`。
 */
export interface Rng {
  /** 回傳 [0, 1) 的亂數並推進種子。 */
  next(): number;
  /** 回傳 [0, count) 的整數。 */
  int(count: number): number;
  pick<T>(items: readonly T[]): T;
  /** 回傳洗牌後的新陣列，不變更輸入。 */
  shuffle<T>(items: readonly T[]): T[];
  readonly seed: number;
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (count: number) => Math.floor(next() * count);
  return {
    next,
    int,
    pick: (items) => items[int(items.length)]!,
    shuffle: (items) => {
      const result = [...items];
      for (let i = result.length - 1; i > 0; i--) {
        const j = int(i + 1);
        [result[i], result[j]] = [result[j]!, result[i]!];
      }
      return result;
    },
    get seed() {
      return state;
    },
  };
}
