/** 套餐中的一個位置：菜譜識別值與是否鎖定。 */
export type Slot = { id: string; locked: boolean };

/** `dishes` 是 4 或 5 道非湯菜（尚未抽選時為空），`soup` 是湯（尚未抽選時為 null）。 */
export type Plan = {
  mode: 4 | 5;
  dishes: Slot[];
  soup: Slot | null;
  seed: number;
};

export type Action =
  | { type: "reroll" }
  | { type: "mode"; mode: 4 | 5 }
  | { type: "replace"; target: number | "soup" }
  | { type: "assign"; target: number | "soup"; id: string }
  | { type: "toggle"; target: number | "soup" };

/** 無解時 `plan` 與輸入內容相同，`reason` 與 `message` 都是繁體中文。 */
export type Result =
  | { ok: true; plan: Plan; message: string }
  | { ok: false; plan: Plan; reason: string };

/** 配菜候選：引擎只需要識別值、是否為湯與兩個平衡標記。 */
export type Candidate = {
  id: string;
  soup: boolean;
  vegetable: boolean;
  protein: boolean;
};
