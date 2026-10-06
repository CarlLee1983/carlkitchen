# 06 — 配菜引擎

Parent: [MVP 實作規格](../../recipe-mvp/issues/09-mvp-implementation-spec.md)

**What to build:** 一個可獨立測試的純模組，負責四菜一湯／五菜一湯的全部規則：給定候選池、目前套餐與一個動作，回傳新套餐，或回傳原套餐與無解原因。隨機性由注入的種子決定。

**Blocked by:** 02

**Status:** ready-for-agent

狀態與動作形狀取自配菜規則原型（05），是已驗證的決策：

```ts
type Slot = { id: string; locked: boolean };
type Plan = { mode: 4 | 5; dishes: Slot[]; soup: Slot | null; seed: number };
type Action =
  | { type: "reroll" }
  | { type: "mode"; mode: 4 | 5 }
  | { type: "replace"; target: number | "soup" }
  | { type: "toggle"; target: number | "soup" };
type Result = { ok: true; plan: Plan; message: string }
            | { ok: false; plan: Plan; reason: string }; // 無解時 plan 為原狀
```

- [ ] 只從配菜候選抽選；非湯菜互不重複；一組 4 或 5 道非湯菜加 1 道湯
- [ ] 至少一道蔬菜菜與**另一道**蛋白質菜；同一道雙標記菜不能獨自滿足兩項
- [ ] 重抽保留鎖定項，未鎖定位置盡量與上一組不同；候選有限時可保留部分原菜但不重複
- [ ] 單道替換只改一個未鎖定位置，排除已選菜色並維持類別、不重複與平衡；已鎖定項回無解並提示先解鎖
- [ ] 模式切換保留鎖定項；五切四而鎖定非湯菜多於四道時回無解
- [ ] 湯可鎖定與替換
- [ ] 候選不足時回無解，不產生不完整或重複套餐
- [ ] 單元測試涵蓋以上每條規則與每個無解分支，並驗證同種子可重現（門檻第 6 項單元部分）
