import type { HomeState, KindFilter } from "../utils/home";
import type { PickData, PickItem } from "../utils/random-picks-data";
import {
  PICK_BATCH_SIZE,
  PICK_MOBILE_QUERY,
  pickBatch,
} from "../utils/random-picks";

/** 候選資料的靜態檔，建置時由 src/pages/random-picks.json.ts 輸出。 */
const PICKS_URL = "/random-picks.json";
/** 換批後的播報文字與延遲（毫秒）。8 道候選時連續兩批會重複，所以不寫張數。 */
const ANNOUNCE_TEXT = "已換一批";
const ANNOUNCE_DELAY_MS = 100;

/** 隨機推薦與首頁狀態的接線；`update` 在每次篩選或搜尋狀態套用時呼叫。 */
export interface RandomPicks {
  update(state: HomeState): void;
}

/**
 * 組出一張卡片。標記須與 `RecipeCard.astro`（連同 `Illustration.astro`）的輸出一致：
 * class、aria-labelledby、figure 與 img 屬性；改動任一邊都要同步，e2e 會比對。
 */
function buildCard(item: PickItem, sizes: string): HTMLAnchorElement {
  const titleId = `recipe-card-title-${item.id}`;
  const link = document.createElement("a");
  link.className = "recipe-card";
  link.href = item.href;
  link.setAttribute("aria-labelledby", titleId);

  const figure = document.createElement("figure");
  figure.className = "illustration";
  figure.setAttribute("data-pagefind-ignore", "all");
  const img = document.createElement("img");
  img.setAttribute("src", item.src);
  img.setAttribute("srcset", item.srcset);
  img.setAttribute("alt", item.alt);
  img.setAttribute("sizes", sizes);
  img.setAttribute("loading", "lazy");
  img.setAttribute("decoding", "async");
  for (const [name, value] of Object.entries(item.extra)) {
    img.setAttribute(name, value);
  }
  img.setAttribute("width", String(item.width));
  img.setAttribute("height", String(item.height));
  figure.append(img);

  const title = document.createElement("span");
  title.className = "recipe-card-title";
  title.id = titleId;
  title.textContent = item.title;
  link.append(figure, title);
  if (item.labels.length > 0) {
    const kind = document.createElement("span");
    kind.className = "recipe-card-kind";
    kind.textContent = item.labels.join("・");
    link.append(kind);
  }
  return link;
}

/**
 * 首頁隨機推薦：每次開啟頁面在瀏覽器端抽一批，不寫入網址、history state 或任何儲存。
 * 候選資料是建置時輸出的靜態 JSON，等頁面 load（大圖等資源都載完）之後才抓，只抓一次、之後重用；
 * 沒有搜尋字詞時才需要資料，所以帶搜尋字開啟時要等清除後才抓。抓取失敗或沒有候選時區塊維持（或回到）隱藏，
 * 不顯示錯誤。只有被抽中的卡片才組成 DOM（未抽中的圖片不下載）；分類取自候選的 `kinds`
 * （建置時由首頁共用的 `recipeKinds` 算出，與清單列的 `data-kinds` 同源）。排除當次大圖那道（識別值取自 `.hero-pick`）。
 * 有搜尋字詞時收起；篩選改變時重抽並重置這一輪；其餘狀態變動沿用目前這批。
 * 區塊只有一份：寬版在菜譜清單之前，手機（< 40rem）搬到清單之後，Tab 順序與無障礙樹都只有一處。
 */
export function initRandomPicks(): RandomPicks {
  const section = document.querySelector<HTMLElement>("[data-random-picks]");
  const list = section?.querySelector<HTMLElement>("[data-picks-list]");
  const recipes = document.querySelector<HTMLElement>("#recipes");
  if (!section || !list || !recipes) return { update() {} };

  // 手機版把區塊放在清單（含顯示更多按鈕）之後，桌機放在清單之前。
  const isMobile = window.matchMedia(PICK_MOBILE_QUERY);
  function place() {
    if (isMobile.matches) recipes!.after(section!);
    else recipes!.before(section!);
  }
  place();
  isMobile.addEventListener("change", place);

  let data: PickData | undefined;
  let requested = false;
  let pageLoaded = document.readyState === "complete";
  let latest: HomeState = { q: "", kind: "all" };
  /** 目前這批是依哪個篩選抽的；undefined 表示還沒抽過。 */
  let drawnKind: KindFilter | undefined;

  /** 收起區塊並清掉預留狀態（預留高度也一併收回）。 */
  function collapse() {
    section!.hidden = true;
    section!.removeAttribute("data-pending");
    section!.removeAttribute("aria-hidden");
  }

  async function load() {
    requested = true;
    try {
      const response = await fetch(PICKS_URL);
      if (!response.ok) throw new Error(String(response.status));
      data = (await response.json()) as PickData;
    } catch (error) {
      console.error("載入隨機推薦失敗", error);
      collapse(); // 失敗就維持隱藏，不顯示錯誤給讀者
      return;
    }
    section!.removeAttribute("data-pending");
    section!.removeAttribute("aria-hidden");
    api.update(latest);
  }

  const shuffleButton = section.querySelector<HTMLButtonElement>(
    "[data-picks-shuffle]",
  );
  const announce = section.querySelector("[data-picks-status]");
  let announceTimer: ReturnType<typeof setTimeout> | undefined;
  /** 這一輪已出現過的識別值，只存在記憶體；換篩選時重置。 */
  let seen: ReadonlySet<string> = new Set();
  let candidateIds: string[] = [];
  let itemsById = new Map<string, PickItem>();

  /** 依篩選重算候選（排除當次大圖那道），並重置這一輪。 */
  function selectCandidates(kind: KindFilter) {
    const heroId = document.querySelector<HTMLElement>(
      ".hero-pick a[data-recipe-id]",
    )?.dataset.recipeId;
    itemsById = new Map(
      data!.items
        .filter(
          (item) =>
            item.id !== heroId && (kind === "all" || item.kinds.includes(kind)),
        )
        .map((item) => [item.id, item]),
    );
    candidateIds = [...itemsById.keys()];
    seen = new Set();
    drawnKind = kind;
  }

  /** 抽下一批並換上畫面；候選超過一批才顯示「換一批」。 */
  function drawBatch() {
    const batch = pickBatch(candidateIds, seen, Math.random);
    seen = batch.seen;
    list!.replaceChildren(
      ...batch.picks.map((id) => {
        const item = document.createElement("li");
        item.append(buildCard(itemsById.get(id)!, data!.sizes));
        return item;
      }),
    );
    // 手機版是橫向捲動，換批後回到最左邊
    list!.scrollLeft = 0;
    if (shuffleButton)
      shuffleButton.hidden = candidateIds.length <= PICK_BATCH_SIZE;
  }

  shuffleButton?.addEventListener("click", () => {
    drawBatch();
    // 按鈕沒被移除，焦點留在原處；以 aria-live 念一句簡短的更新，不重念整批卡片。
    // 先清空，隔 100ms 再寫入：連按時報讀器才不會把兩次異動合併而不播報。
    if (announce) {
      announce.textContent = "";
      clearTimeout(announceTimer);
      announceTimer = setTimeout(() => {
        announce.textContent = ANNOUNCE_TEXT;
      }, ANNOUNCE_DELAY_MS);
    }
  });

  function maybeLoad() {
    if (pageLoaded && !requested && latest.q === "") void load();
  }
  if (!pageLoaded) {
    window.addEventListener(
      "load",
      () => {
        pageLoaded = true;
        maybeLoad();
      },
      { once: true },
    );
  }

  const api: RandomPicks = {
    update(state) {
      latest = state;
      if (state.q !== "") {
        collapse();
        return;
      }
      if (!data) {
        maybeLoad(); // 資料到之前沿用目前的外觀（桌機是預留的佔位）
        return;
      }
      if (drawnKind !== state.kind) {
        selectCandidates(state.kind);
        drawBatch();
      }
      if (list.childElementCount === 0) collapse();
      else section.hidden = false;
    },
  };
  return api;
}
