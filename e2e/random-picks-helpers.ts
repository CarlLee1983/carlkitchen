import type { Page } from "@playwright/test";
import type { PickData, PickItem } from "../src/utils/random-picks-data";

// 「換一批」：固定菜譜扣掉大圖只有 5 道候選，做不出超過一批的情境，
// 所以攔截候選 JSON，用真實資料的形狀複製出 N 筆（識別值與菜名改過，圖片沿用）。

/** 複製出來的第 i 筆菜名：補零成兩位，字典序即建立順序。 */
export const pickTitle = (i: number) => `推薦${String(i).padStart(2, "0")}`;

// 料理主角值對應的標籤文字，與清單列相同
const KIND_LABELS: Record<string, string> = {
  vegetable: "蔬菜",
  meat: "肉類",
  seafood: "海鮮",
  "egg-bean": "蛋豆",
  staple: "主食",
  soup: "湯",
};

export async function routePicks(
  page: Page,
  count: number,
  kindOf: (index: number) => string = () => "meat",
) {
  await page.route("**/random-picks.json", async (route) => {
    const response = await route.fetch();
    const data = (await response.json()) as PickData;
    const base = data.items[0];
    if (!base) throw new Error("固定菜譜的候選資料是空的，沒有可複製的項目");
    const items: PickItem[] = Array.from({ length: count }, (_, i) => {
      const kind = kindOf(i);
      const label = KIND_LABELS[kind];
      if (!label) throw new Error(`未知的料理主角：${kind}`);
      return {
        ...base,
        id: `pick-${i}`,
        href: `/recipes/pick-${i}/`,
        title: pickTitle(i),
        kinds: [kind],
        labels: [label],
      };
    });
    await route.fulfill({ response, json: { ...data, items } });
  });
}
