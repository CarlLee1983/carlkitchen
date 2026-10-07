import {
  applyAction,
  applyDraftChoice,
  createDraft,
  createPlan,
  draftProgress,
  type Draft,
  type Action,
  type Candidate,
  type Plan,
} from "../meal-planner/index.ts";
import {
  MEAL_STORAGE_KEY,
  restorePlan,
  serializeDraft,
  serializePlan,
} from "../utils/meal-session";

/** 建置時輸出給前端的資料：引擎的候選池，加上顯示用的菜名、連結與縮圖。 */
export interface MealData {
  candidates: Candidate[];
  recipes: Record<string, { title: string; href: string }>;
}

const STALE_MESSAGE = "已保存的套餐已失效，已清除；請重新抽選。";

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
function writeSavedDraft(draft: Draft) {
  try {
    sessionStorage.setItem(MEAL_STORAGE_KEY, serializeDraft(draft));
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
  const selfButton = document.querySelector("[data-self-select]");
  if (!dataElement?.textContent || !planList || !status || !emptyNote) return;

  const { candidates, recipes } = JSON.parse(
    dataElement.textContent,
  ) as MealData;
  // 縮圖標記只有一份來源：建置時由 Illustration 渲染在 template 裡，這裡只複製。
  const thumbs = new Map(
    [
      ...document.querySelectorAll<HTMLTemplateElement>("template[data-thumb]"),
    ].map((template) => [template.dataset.thumb, template]),
  );
  const kinds = new Map(candidates.map((item) => [item.id, item]));

  let plan: Plan = createPlan(randomSeed());
  let draft: Draft | null = null;
  let message = "";
  const searches = new Map<string, string>();
  const restored = restorePlan(readSaved(), candidates);
  if (restored.kind === "restored") {
    plan = restored.plan;
  } else if (restored.kind === "restored-draft") {
    draft = restored.draft;
    message = draftProgress(candidates, draft).message;
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
    id: string | null,
    locked: boolean,
    target: number | "soup",
    slotLabel: string,
  ) {
    const info = id ? recipes[id]! : null;
    const item = el("li", undefined, "meal-item");
    const thumb = id
      ? thumbs.get(id)?.content.firstElementChild?.cloneNode(true)
      : null;
    if (thumb) item.append(thumb);
    const heading = el("h2");
    if (info) {
      const link = el("a", info.title);
      link.href = info.href;
      heading.append(link);
    } else {
      heading.textContent = "尚未指定";
    }

    const actions = el("div", undefined, "meal-actions");
    const searchLabel = el("label", target === "soup" ? "搜尋湯" : "搜尋菜色");
    const search = el("input");
    search.type = "search";
    search.setAttribute(
      "aria-label",
      `${target === "soup" ? "搜尋湯" : "搜尋菜色"} ${slotLabel}`,
    );
    search.dataset.action = "search";
    search.dataset.target = String(target);
    search.value = searches.get(String(target)) ?? "";
    searchLabel.append(search);
    actions.append(searchLabel);
    const chooserLabel = el("label", target === "soup" ? "指定湯" : "指定菜色");
    const chooser = el("select");
    chooser.setAttribute(
      "aria-label",
      `${target === "soup" ? "指定湯" : "指定菜色"} ${slotLabel}`,
    );
    chooser.dataset.action = "assign";
    chooser.dataset.target = String(target);
    const hint = el("span", undefined, "meal-search-hint");
    hint.id = `meal-search-${target}`;
    search.setAttribute("aria-describedby", hint.id);
    chooser.setAttribute("aria-describedby", hint.id);
    updateChoices(target, id, search.value, chooser, hint);
    chooserLabel.append(hint);
    chooserLabel.append(chooser);
    if (info && !draft) {
      const lock = actionButton("鎖定", info.title, "toggle", target);
      lock.setAttribute("aria-pressed", String(locked));
      actions.append(lock, actionButton("替換", info.title, "replace", target));
    }
    actions.append(chooserLabel);

    item.append(
      el(
        "span",
        [slotLabel, locked && "已鎖定", id && tagsOf(id)]
          .filter(Boolean)
          .join("・"),
        "meal-slot",
      ),
      heading,
      actions,
    );
    return item;
  }

  function updateChoices(
    target: number | "soup",
    currentId: string | null,
    query: string,
    chooser: HTMLSelectElement,
    hint: HTMLElement,
  ) {
    const shown = draft ?? plan;
    const searching = query.trim().length > 0;
    const chosenElsewhere = new Set([
      ...shown.dishes.map((slot, index) =>
        index === target ? null : slot?.id,
      ),
      target === "soup" ? null : shown.soup?.id,
    ]);
    const matches = candidates.filter(
      (candidate) =>
        candidate.soup === (target === "soup") &&
        !chosenElsewhere.has(candidate.id) &&
        recipes[candidate.id]!.title.includes(query.trim()),
    );
    chooser.replaceChildren();
    if (draft || !currentId || searching) {
      const placeholder = el(
        "option",
        target === "soup" ? "請選擇湯" : "請選擇菜色",
      );
      placeholder.value = "";
      chooser.append(placeholder);
    }
    for (const candidate of matches) {
      const option = el("option", recipes[candidate.id]!.title);
      option.value = candidate.id;
      chooser.append(option);
    }
    chooser.value = matches.some((candidate) => candidate.id === currentId)
      ? currentId!
      : "";
    const name = target === "soup" ? "湯" : "菜色";
    hint.textContent = matches.length
      ? `${searching ? "找到" : "可選"} ${matches.length} 道${name}。${searching && matches.length === 1 ? "按 Enter 可直接指定。" : ""}`
      : `找不到可選${name}，請清除或更改搜尋。`;
  }

  /** 相同訊息連續出現時先清空、下一幀再寫入，讀屏軟體才會再朗讀一次。 */
  let announceFrame = 0;
  function announce(text: string) {
    cancelAnimationFrame(announceFrame);
    if (status!.textContent === text && text !== "") {
      status!.textContent = "";
      announceFrame = requestAnimationFrame(() => {
        status!.textContent = text;
      });
    } else {
      status!.textContent = text;
    }
  }

  function render() {
    // 整份清單重畫會讓焦點消失，先記住再還原，鍵盤才能連續操作。
    const active = document.activeElement as HTMLElement | null;
    const focusKey =
      active && planList!.contains(active)
        ? `${active.dataset.action}:${active.dataset.target}`
        : null;

    const shown = draft ?? plan;
    planList!.replaceChildren(
      ...shown.dishes.map((slot, i) =>
        renderItem(slot?.id ?? null, slot?.locked ?? false, i, `菜 ${i + 1}`),
      ),
      ...(draft || plan.soup
        ? [
            renderItem(
              shown.soup?.id ?? null,
              shown.soup?.locked ?? false,
              "soup",
              "湯",
            ),
          ]
        : []),
    );
    emptyNote!.hidden =
      draft !== null || plan.dishes.length > 0 || plan.soup !== null;
    for (const button of modeButtons) {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.mode === String(shown.mode)),
      );
    }
    announce(message);

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
      if (action.type === "assign") searches.delete(String(action.target));
      else searches.clear();
      writeSaved(plan);
      message = result.message;
    } else {
      message = result.reason; // 無解時引擎保證 plan 不變
    }
    render();
  }

  selfButton?.addEventListener("click", () => {
    if (
      (draft?.dishes.some(Boolean) || draft?.soup || plan.dishes.length > 0) &&
      !window.confirm("從空白開始會捨棄目前選的菜色，確定嗎？")
    )
      return;
    draft = createDraft(plan.seed, draft?.mode ?? plan.mode);
    searches.clear();
    writeSavedDraft(draft);
    message = draftProgress(candidates, draft).message;
    render();
  });
  rerollButton?.addEventListener("click", () => {
    if (
      draft &&
      (draft.dishes.some(Boolean) || draft.soup) &&
      !window.confirm("重新抽選會捨棄目前自選的菜色，確定嗎？")
    )
      return;
    if (draft) {
      const result = applyAction(
        candidates,
        createPlan(draft.seed, draft.mode),
        { type: "reroll" },
      );
      if (result.ok) {
        plan = result.plan;
        draft = null;
        searches.clear();
        writeSaved(plan);
        message = result.message;
      } else {
        message = result.reason;
      }
      render();
      return;
    }
    dispatch({ type: "reroll" });
  });
  for (const button of modeButtons) {
    button.addEventListener("click", () => {
      const mode = button.dataset.mode === "5" ? 5 : 4;
      if (draft) {
        if (draft.mode === mode) return;
        if (
          mode === 4 &&
          draft.dishes[4] &&
          !window.confirm("切換四菜一湯會捨棄第五道菜，確定嗎？")
        )
          return;
        draft = {
          ...draft,
          mode,
          dishes:
            mode === 5 ? [...draft.dishes, null] : draft.dishes.slice(0, 4),
        };
        writeSavedDraft(draft);
        message = draftProgress(candidates, draft).message;
        render();
      } else {
        if (
          plan.mode !== mode &&
          plan.dishes.length > 0 &&
          !window.confirm("切換菜數會重新抽選未鎖定的菜色，確定嗎？")
        )
          return;
        dispatch({ type: "mode", mode });
      }
    });
  }
  planList.addEventListener("click", (event) => {
    const button = (event.target as Element).closest<HTMLElement>(
      "button[data-action]",
    );
    if (!button) return;
    const raw = button.dataset.target!;
    const target = raw === "soup" ? "soup" : Number(raw);
    dispatch({ type: button.dataset.action as "toggle" | "replace", target });
  });
  planList.addEventListener("change", (event) => {
    const select = event.target;
    if (
      !(select instanceof HTMLSelectElement) ||
      select.dataset.action !== "assign"
    )
      return;
    const raw = select.dataset.target!;
    if (draft) {
      const result = applyDraftChoice(
        candidates,
        draft,
        raw === "soup" ? "soup" : Number(raw),
        select.value,
      );
      if (result.ok) {
        draft = result.draft;
        searches.delete(raw);
        const progress = draftProgress(candidates, draft);
        message = progress.message;
        if (progress.complete) {
          plan = progress.plan;
          draft = null;
          searches.clear();
          writeSaved(plan);
        } else {
          writeSavedDraft(draft);
        }
      } else {
        message = result.reason;
      }
      render();
      return;
    }
    dispatch({
      type: "assign",
      target: raw === "soup" ? "soup" : Number(raw),
      id: select.value,
    });
  });

  planList.addEventListener("input", (event) => {
    const search = event.target;
    if (
      !(search instanceof HTMLInputElement) ||
      search.dataset.action !== "search"
    )
      return;
    const raw = search.dataset.target!;
    searches.set(raw, search.value);
    const item = search.closest(".meal-item")!;
    const chooser = item.querySelector<HTMLSelectElement>(
      "select[data-action='assign']",
    )!;
    const hint = item.querySelector<HTMLElement>(".meal-search-hint")!;
    const target = raw === "soup" ? "soup" : Number(raw);
    const shown = draft ?? plan;
    const currentId =
      target === "soup"
        ? (shown.soup?.id ?? null)
        : (shown.dishes[target]?.id ?? null);
    updateChoices(target, currentId, search.value, chooser, hint);
    announce(hint.textContent ?? "");
  });
  planList.addEventListener("keydown", (event) => {
    const search = event.target;
    if (
      event.key !== "Enter" ||
      !(search instanceof HTMLInputElement) ||
      search.dataset.action !== "search"
    )
      return;
    const chooser = search
      .closest(".meal-item")
      ?.querySelector<HTMLSelectElement>("select[data-action='assign']");
    const matches = chooser?.querySelectorAll<HTMLOptionElement>(
      "option:not([value=''])",
    );
    if (matches?.length !== 1) return;
    event.preventDefault();
    chooser!.value = matches[0]!.value;
    chooser!.dispatchEvent(new Event("change", { bubbles: true }));
  });

  render();
}
