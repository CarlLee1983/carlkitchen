import {
  applyAction,
  applyDraftChoice,
  createDraft,
  createPlan,
  draftProgress,
  isCompletePlan,
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
import { decodeSharedMeal, encodeSharedMeal } from "../utils/meal-share";

/** 建置時輸出給前端的資料：引擎的候選池，加上顯示用的菜名、連結與縮圖。 */
export interface MealData {
  candidates: Candidate[];
  recipes: Record<string, { title: string; href: string }>;
}

const STALE_MESSAGE = "已保存的套餐已失效，已清除；請重新抽選。";
const SAVE_FAILURE = "無法儲存這次變更，原菜單與網址已保留。";
const SAVE_WARNING =
  "已更新菜單，但瀏覽器無法保存分頁狀態；重新開啟後鎖定或草稿可能消失。";
const ENTRY_MENU_KEY = "carlkitchenMealMenu";
const ENTRY_DRAFT_KEY = "carlkitchenMealDraft";

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
function writeSaved(plan: Plan): boolean {
  try {
    sessionStorage.setItem(MEAL_STORAGE_KEY, serializePlan(plan));
    return true;
  } catch {
    return false;
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
  const copyButton =
    document.querySelector<HTMLButtonElement>("[data-copy-meal]");
  const nativeButton =
    document.querySelector<HTMLButtonElement>("[data-share-meal]");
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

  function entryState(
    menu: string | null,
    draftRaw?: string,
  ): Record<string, unknown> {
    const state = history.state;
    const next: Record<string, unknown> =
      state && typeof state === "object" ? { ...state } : {};
    if (menu === null) {
      delete next[ENTRY_MENU_KEY];
      if (draftRaw === undefined) delete next[ENTRY_DRAFT_KEY];
      else next[ENTRY_DRAFT_KEY] = draftRaw;
    } else {
      next[ENTRY_MENU_KEY] = menu;
      delete next[ENTRY_DRAFT_KEY];
    }
    return next;
  }

  type CommitResult =
    { ok: true; warning?: string } | { ok: false; reason: string };

  function committedMessage(message: string, result: { warning?: string }) {
    return result.warning ? `${message} ${result.warning}` : message;
  }

  function commitSaved(
    raw: string,
    menu: string | null | undefined,
  ): CommitResult {
    let previous: string | null = null;
    let saved = false;
    try {
      previous = sessionStorage.getItem(MEAL_STORAGE_KEY);
      sessionStorage.setItem(MEAL_STORAGE_KEY, raw);
      saved = true;
    } catch {
      // 完整菜單仍由網址還原；草稿另存於這筆瀏覽紀錄。
    }
    if (menu === undefined)
      return saved ? { ok: true } : { ok: true, warning: SAVE_WARNING };
    const oldUrl = location.href;
    const oldState = history.state;
    const url = new URL(oldUrl);
    if (menu === null) url.searchParams.delete("menu");
    else url.searchParams.set("menu", menu);
    try {
      history.replaceState(
        entryState(menu, menu === null ? raw : undefined),
        "",
        url,
      );
      return saved ? { ok: true } : { ok: true, warning: SAVE_WARNING };
    } catch {
      let recovered = true;
      if (saved) {
        try {
          if (previous === null) sessionStorage.removeItem(MEAL_STORAGE_KEY);
          else sessionStorage.setItem(MEAL_STORAGE_KEY, previous);
        } catch {
          recovered = false;
        }
      }
      if (location.href !== oldUrl || history.state !== oldState) {
        try {
          history.replaceState(oldState, "", oldUrl);
        } catch {
          recovered = false;
        }
      }
      return {
        ok: false,
        reason: recovered
          ? SAVE_FAILURE
          : "無法儲存這次變更，瀏覽器狀態可能未還原；請重新整理頁面。",
      };
    }
  }

  function commitComplete(next: Plan): CommitResult {
    const encoded = encodeSharedMeal(next, candidates);
    if (!encoded)
      return { ok: false, reason: "目前菜單無法儲存或分享，原菜單已保留。" };
    return commitSaved(serializePlan(next), encoded);
  }

  function commitDraft(next: Draft): CommitResult {
    return commitSaved(serializeDraft(next), null);
  }

  function loadFromLocation(allowReloadLocks: boolean) {
    plan = createPlan(randomSeed());
    draft = null;
    searches.clear();
    message = "";
    const values = new URL(location.href).searchParams.getAll("menu");
    if (values.length > 0) {
      if (values.length !== 1) {
        message = "菜單連結含有多個 menu 參數，無法開啟。";
        return;
      }
      const decoded = decodeSharedMeal(values[0]!, candidates);
      if (!decoded.ok) {
        message = decoded.reason;
        return;
      }
      const restored = restorePlan(readSaved(), candidates);
      const savedMatches =
        restored.kind === "restored" &&
        encodeSharedMeal(restored.plan, candidates) === values[0];
      const marker = history.state?.[ENTRY_MENU_KEY] === values[0];
      plan =
        allowReloadLocks && marker && savedMatches
          ? restored.plan
          : { ...decoded.plan, seed: randomSeed() };
      if (writeSaved(plan)) {
        try {
          history.replaceState(entryState(values[0]!), "", location.href);
        } catch {
          message = "菜單已開啟，但瀏覽器無法保存重新整理所需的分頁狀態。";
        }
      } else {
        message = "菜單已開啟，但瀏覽器無法保存分頁狀態。";
      }
      return;
    }
    const entryDraft = history.state?.[ENTRY_DRAFT_KEY];
    if (typeof entryDraft === "string") {
      const fromEntry = restorePlan(entryDraft, candidates);
      if (fromEntry.kind === "restored-draft") {
        draft = fromEntry.draft;
        message = draftProgress(candidates, draft).message;
        try {
          sessionStorage.setItem(MEAL_STORAGE_KEY, entryDraft);
        } catch {
          /* 這筆瀏覽紀錄仍能在同分頁重新整理後還原草稿。 */
        }
      } else {
        message = "已保存的自選草稿已失效；請重新開始。";
      }
      return;
    }
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
  }

  const navigation = performance.getEntriesByType("navigation")[0] as
    PerformanceNavigationTiming | undefined;
  loadFromLocation(navigation?.type === "reload");

  function shareUrl(): string | null {
    const encoded = draft ? null : encodeSharedMeal(plan, candidates);
    if (!encoded) return null;
    const url = new URL("/meal/", location.origin);
    url.searchParams.set("menu", encoded);
    return url.href;
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
      const lock = actionButton(
        locked ? "已鎖定" : "鎖定",
        info.title,
        "toggle",
        target,
      );
      lock.setAttribute("aria-label", `鎖定 ${info.title}`);
      lock.setAttribute("aria-pressed", String(locked));
      actions.append(lock, actionButton("替換", info.title, "replace", target));
    }
    actions.append(chooserLabel);

    item.append(
      el(
        "span",
        [slotLabel, id && tagsOf(id)].filter(Boolean).join("・"),
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
        (draft !== null ||
          candidate.id === currentId ||
          isCompletePlan(candidates, {
            ...plan,
            dishes:
              target === "soup"
                ? plan.dishes
                : plan.dishes.map((slot, index) =>
                    index === target
                      ? { id: candidate.id, locked: false }
                      : slot,
                  ),
            soup:
              target === "soup"
                ? { id: candidate.id, locked: false }
                : plan.soup,
          })) &&
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
    const canShare = shareUrl() !== null;
    if (copyButton) copyButton.disabled = !canShare;
    if (nativeButton) nativeButton.disabled = !canShare;

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
      const committed =
        action.type === "toggle"
          ? commitSaved(serializePlan(result.plan), undefined)
          : commitComplete(result.plan);
      if (committed.ok) {
        plan = result.plan;
        if (action.type === "assign") searches.delete(String(action.target));
        else searches.clear();
        message = committedMessage(result.message, committed);
      } else {
        message = committed.reason;
      }
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
    const next = createDraft(plan.seed, draft?.mode ?? plan.mode);
    const committed = commitDraft(next);
    if (committed.ok) {
      draft = next;
      searches.clear();
      message = committedMessage(
        draftProgress(candidates, next).message,
        committed,
      );
    } else {
      message = committed.reason;
    }
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
        const committed = commitComplete(result.plan);
        if (committed.ok) {
          plan = result.plan;
          draft = null;
          searches.clear();
          message = committedMessage(result.message, committed);
        } else {
          message = committed.reason;
        }
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
        const next: Draft = {
          ...draft,
          mode,
          dishes:
            mode === 5 ? [...draft.dishes, null] : draft.dishes.slice(0, 4),
        };
        const committed = commitDraft(next);
        if (committed.ok) {
          draft = next;
          message = committedMessage(
            draftProgress(candidates, next).message,
            committed,
          );
        } else {
          message = committed.reason;
        }
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
        const progress = draftProgress(candidates, result.draft);
        if (progress.complete) {
          const committed = commitComplete(progress.plan);
          if (committed.ok) {
            plan = progress.plan;
            draft = null;
            searches.clear();
            message = committedMessage(progress.message, committed);
          } else {
            message = committed.reason;
          }
        } else {
          const committed = commitDraft(result.draft);
          if (committed.ok) {
            draft = result.draft;
            searches.delete(raw);
            message = committedMessage(progress.message, committed);
          } else {
            message = committed.reason;
          }
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

  copyButton?.addEventListener("click", async () => {
    const url = shareUrl();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      message = "菜單連結已複製。";
    } catch {
      message = "無法複製菜單連結，請檢查瀏覽器的剪貼簿權限。";
    }
    announce(message);
  });
  if (nativeButton) {
    nativeButton.hidden = typeof navigator.share !== "function";
    nativeButton.addEventListener("click", async () => {
      const url = shareUrl();
      if (!url || typeof navigator.share !== "function") return;
      try {
        await navigator.share({ title: "配一桌菜", url });
        message = "已分享菜單連結。";
      } catch (error) {
        message =
          error instanceof DOMException && error.name === "AbortError"
            ? "已取消分享。"
            : "無法分享菜單連結，請改用複製連結。";
      }
      announce(message);
    });
  }

  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    loadFromLocation(false);
    render();
  });

  render();
}
