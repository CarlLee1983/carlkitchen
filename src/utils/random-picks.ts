/** 隨機推薦每批的道數。 */
export const PICK_BATCH_SIZE = 6;

export interface PickResult {
  /** 這一批的識別值，最多 PICK_BATCH_SIZE 個，彼此不重複。 */
  picks: string[];
  /** 這一輪已出現過的識別值（含本批），供下一次抽批傳入。 */
  seen: Set<string>;
}

/** 從 items 不重複地抽 count 個（部分 Fisher–Yates）；不改動輸入。 */
function sample(
  items: readonly string[],
  count: number,
  random: () => number,
): string[] {
  const pool = [...items];
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(random() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return pool.slice(0, count);
}

/**
 * 抽出下一批隨機推薦。先從這一輪還沒出現過的候選抽；不足一批時，把沒出現過的全部先放入，
 * 開始新的一輪，再從其餘候選補滿。候選不超過一批時全部回傳。
 * 純函式：不讀 DOM、不呼叫全域亂數，`random` 回傳 [0, 1)，由呼叫端注入。
 */
export function pickBatch(
  candidates: readonly string[],
  seen: ReadonlySet<string>,
  random: () => number,
): PickResult {
  if (candidates.length <= PICK_BATCH_SIZE) {
    return { picks: [...candidates], seen: new Set(candidates) };
  }
  const unseen = candidates.filter((id) => !seen.has(id));
  if (unseen.length >= PICK_BATCH_SIZE) {
    const picks = sample(unseen, PICK_BATCH_SIZE, random);
    return { picks, seen: new Set([...seen, ...picks]) };
  }
  // 新一輪：沒出現過的全入選，其餘從尚未入選的候選補滿；已出現集合只記本批。
  const taken = new Set(unseen);
  const rest = candidates.filter((id) => !taken.has(id));
  const picks = [
    ...unseen,
    ...sample(rest, PICK_BATCH_SIZE - unseen.length, random),
  ];
  return { picks, seen: new Set(picks) };
}

/** 手機版斷點：此寬度以下推薦區塊搬到清單之後、卡片橫向捲動。首頁預留腳本與 home-picks.ts 共用。 */
export const PICK_MOBILE_QUERY = "(max-width: 39.99rem)";
/** 手機版每張卡片的固定寬度（CSS 的 --pick-card-width 與 sizes 同源）。 */
export const PICK_MOBILE_CARD_WIDTH = "9rem";

// 寬版一列 PICK_BATCH_SIZE 張、欄距 1rem；頁面內容寬上限 72rem 扣左右留白 3rem（= 69rem）。
const GAP_REM = 1;
const SIDE_REM = 3;
const CONTENT_MAX_REM = 72 - SIDE_REM;
const gaps = (PICK_BATCH_SIZE - 1) * GAP_REM;
/** 推薦卡片圖的 sizes：照實際顯示寬度寫，三個斷點（≥ 72rem、≥ 40rem、手機）。 */
export const PICK_SIZES = `(min-width: 72rem) calc(${CONTENT_MAX_REM - gaps}rem / ${PICK_BATCH_SIZE}), (min-width: 40rem) calc((100vw - ${SIDE_REM + gaps}rem) / ${PICK_BATCH_SIZE}), ${PICK_MOBILE_CARD_WIDTH}`;
