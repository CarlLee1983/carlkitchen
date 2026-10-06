import {
  applyAction,
  createPlan,
  type Action,
  type Candidate,
  type Plan,
} from "../meal-planner/index.ts";
import {
  MEAL_STORAGE_KEY,
  restorePlan,
  serializePlan,
} from "../utils/meal-session";

/** 建置時輸出給前端的資料：引擎的候選池，加上顯示用的菜名、連結與縮圖。 */
export interface MealData {
  candidates: Candidate[];
  recipes: Record<
    string,
    {
      title: string;
      href: string;
      thumb?: { src: string; width: number; height: number; alt: string };
    }
  >;
}

const STALE_MESSAGE = "已保存的套餐含已不在候選池的菜譜，已清除；請重新抽選。";

function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0]!;
}

/** sessionStorage 在隱私模式或被封鎖時會丟例外；讀寫失敗就當作沒有保存。 */
function readSaved(): string | null {
  try {
    return sessionStorage.getItem(MEAL_STORAGE_KEY);
  } catch {
    return null;
  }
}
function writeSaved(plan: Plan) {
  try {
    sessionStorage.setItem(MEAL_STORAGE_KEY, serializePlan(plan));
  } catch {
    /* 保存失敗只影響重整還原，不影響操作 */
  }
}
function clearSaved() {
  try {
    sessionStorage.removeItem(MEAL_STORAGE_KEY);
  } catch {
    /* 同上 */
  }
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text?: string,
  className?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
}

/**
 * 配菜頁外殼：把按鈕轉成引擎動作，把引擎回傳的結果畫出來。
 * 所有規則（平衡、鎖定、無解原因）都由 `applyAction` 決定，這裡不判斷。
 */
export function initMeal() {
  const dataElement = document.querySelector("#meal-data");
  const planList = document.querySelector<HTMLOListElement>("[data-plan]");
  const status = document.querySelector("[data-status]");
  const emptyNote = document.querySelector<HTMLElement>("[data-empty]");
  const modeButtons = [
    ...document.querySelectorAll<HTMLButtonElement>("[data-mode]"),
  ];
  const rerollButton = document.querySelector("[data-reroll]");
  if (!dataElement?.textContent || !planList || !status || !emptyNote) return;

  const { candidates, recipes } = JSON.parse(
    dataElement.textContent,
  ) as MealData;
  const kinds = new Map(candidates.map((item) => [item.id, item]));

  let plan: Plan = createPlan(randomSeed());
  let message = "";
  const restored = restorePlan(readSaved(), candidates);
  if (restored.kind === "restored") {
    plan = restored.plan;
  } else if (restored.kind === "stale") {
    clearSaved();
    message = STALE_MESSAGE;
  }

  function tagsOf(id: string): string {
    const item = kinds.get(id);
    if (!item) return "";
    if (item.soup) return "湯";
    return [item.vegetable && "蔬菜", item.protein && "蛋白質"]
      .filter(Boolean)
      .join("／");
  }

  function actionButton(
    label: string,
    title: string,
    action: string,
    target: number | "soup",
  ) {
    const button = el("button", label);
    button.type = "button";
    button.setAttribute("aria-label", `${label} ${title}`);
    button.dataset.action = action;
    button.dataset.target = String(target);
    return button;
  }

  function renderItem(
    id: string,
    locked: boolean,
    target: number | "soup",
    slotLabel: string,
  ) {
    const info = recipes[id]!;
    const item = el("li", undefined, "meal-item");
    if (info.thumb) {
      const figure = el("figure", undefined, "illustration thumb");
      const img = el("img");
      img.src = info.thumb.src;
      img.width = info.thumb.width;
      img.height = info.thumb.height;
      img.alt = info.thumb.alt;
      img.loading = "lazy";
      figure.append(img, el("figcaption", "AI 繪製插畫"));
      item.append(figure);
    }
    const heading = el("h2");
    const link = el("a", info.title);
    link.href = info.href;
    heading.append(link);

    const lock = actionButton("鎖定", info.title, "toggle", target);
    lock.setAttribute("aria-pressed", String(locked));
    const actions = el("div", undefined, "meal-actions");
    actions.append(lock, actionButton("替換", info.title, "replace", target));

    item.append(
      el("span", `${slotLabel}・${tagsOf(id)}`, "meal-slot"),
      heading,
      actions,
    );
    return item;
  }

  function render() {
    // 整份清單重畫會讓焦點消失，先記住再還原，鍵盤才能連續操作。
    const active = document.activeElement as HTMLElement | null;
    const focusKey =
      active && planList!.contains(active)
        ? `${active.dataset.action}:${active.dataset.target}`
        : null;

    planList!.replaceChildren(
      ...plan.dishes.map((slot, i) =>
        renderItem(slot.id, slot.locked, i, `菜 ${i + 1}`),
      ),
      ...(plan.soup
        ? [renderItem(plan.soup.id, plan.soup.locked, "soup", "湯")]
        : []),
    );
    emptyNote!.hidden = plan.dishes.length > 0 || plan.soup !== null;
    for (const button of modeButtons) {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.mode === String(plan.mode)),
      );
    }
    // 即使文字相同也重寫，連續兩次相同的失敗才會再次朗讀。
    status!.textContent = message;

    if (focusKey) {
      planList!
        .querySelector<HTMLElement>(
          `[data-action="${focusKey.split(":")[0]}"][data-target="${focusKey.split(":")[1]}"]`,
        )
        ?.focus();
    }
  }

  function dispatch(action: Action) {
    const result = applyAction(candidates, plan, action);
    if (result.ok) {
      plan = result.plan;
      writeSaved(plan);
      message = result.message;
    } else {
      message = result.reason; // 無解時引擎保證 plan 不變
    }
    render();
  }

  rerollButton?.addEventListener("click", () => dispatch({ type: "reroll" }));
  for (const button of modeButtons) {
    button.addEventListener("click", () =>
      dispatch({ type: "mode", mode: button.dataset.mode === "5" ? 5 : 4 }),
    );
  }
  planList.addEventListener("click", (event) => {
    const button = (event.target as Element).closest<HTMLElement>(
      "[data-action]",
    );
    if (!button) return;
    const raw = button.dataset.target!;
    const target = raw === "soup" ? "soup" : Number(raw);
    dispatch({ type: button.dataset.action as "toggle" | "replace", target });
  });

  render();
}
