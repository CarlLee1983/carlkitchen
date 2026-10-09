# 肉類材料名稱改回來源寫法（2026-10-09）

站主新規則：來源沒寫肉的部位時，材料名照來源寫法，建議部位放 note（「建議用<部位>」，已有 note 時接在後面）；來源有寫部位的照來源寫，不動。`home-braised-tofu`、`red-wine-beef-stew`、`rice-wine-pork-meatballs` 已先照新規則改好，本次不重複處理。`seafood-pasta`、`japanese-yaki-udon` 由另一個代理處理，本次未碰。

範圍：所有 `draft: false` 菜譜的肉類材料。來源以 `content/sources/<id>.yaml` 的核准網址為準，頁面取自 `/Users/carl/.claude/jobs/4271601d/tmp/scan/`，缺的另以 `fetch-ytower.sh`／curl 抓到 `/Users/carl/.claude/jobs/4271601d/tmp/meatcut/`。材料名、步驟、tip 與替代文字中的同一材料名稱一併改，其他字不動。改完每道對全部核准來源頁跑 `overlap.mjs`，全數無 12 字以上相同片段。

## 已改（21 道）

| 菜譜 | 原名稱 | 新名稱＋note | 來源原文寫法 |
| --- | --- | --- | --- |
| `air-fryer-salt-pepper-ribs` | 豬小排（切塊） | 排骨（切塊，建議用豬小排） | 楊桃 A02-3685：「排骨」 |
| `corn-pork-rib-soup` | 豬小排 | 排骨（建議用豬小排） | 味之素 id=200：「排骨」；楊桃 A02-1149：「排骨 220公克」 |
| `winter-melon-pork-rib-soup` | 豬小排 | 排骨（建議用豬小排） | 楊桃 A02-3870：「排骨」 |
| `beef-tofu-casserole` | 牛梅花肉片（燒烤用薄片） | 牛肉片（燒烤用薄片，建議用牛梅花） | 自由時報 12846：「燒烤牛肉片 150克」 |
| `ginger-pork-rice-bowl` | 豬梅花肉片 | 豬肉片（建議用梅花肉） | 楊桃 A02-3394：「豬肉片」 |
| `potato-pork-stew` | 豬梅花肉（切塊） | 豬肉（切塊，建議用梅花肉） | 楊桃 A02-3716：「豬肉 300公克」 |
| `cabbage-rice` | 豬里肌肉絲 | 豬肉絲（建議用里肌肉） | 自由時報 2944：「肉絲」 |
| `hot-and-sour-soup` | 豬里肌肉絲 | 豬肉絲（建議用里肌肉） | 愛料理 279840、363456：「豬肉絲」 |
| `turnip-cake-soup` | 豬里肌肉絲 | 豬肉絲（建議用里肌肉） | 楊桃 G01-1108：「豬肉絲」 |
| `taiwanese-fried-rice-noodles` | 豬里肌肉絲（也可用梅花肉或五花肉切絲） | 豬肉絲（建議用里肌肉，也可用梅花肉或五花肉切絲） | 楊桃 A02-2789：「肉絲」；其餘三份核准來源是豬肉部位指南，不是這道菜的材料表（見 `.scratch/staples/pork-cut-sources.md`）。步驟 1「里肌肉切絲」改「豬肉切絲」 |
| `dry-fried-green-beans` | 豬梅花絞肉 | 豬絞肉（建議用梅花絞肉） | 愛料理 264731、楊桃 F05-0317：「絞肉」 |
| `fly-head-stir-fry` | 豬梅花絞肉 | 豬絞肉（建議用梅花絞肉） | 楊桃 F01-0970：「豬絞肉」 |
| `mapo-tofu` | 豬梅花絞肉 | 豬絞肉（建議用梅花絞肉） | 楊桃 D01-0620、愛料理 108069：「豬絞肉」 |
| `minced-pork-noodles` | 豬梅花絞肉 | 豬絞肉（建議用梅花絞肉） | 楊桃 A02-1325：「絞肉」 |
| `pork-sauce-spinach` | 豬梅花絞肉 | 豬絞肉（建議用梅花絞肉） | 楊桃 F02-0772：「豬絞肉」 |
| `steamed-pork-pickled-cucumber` | 豬梅花絞肉 | 豬絞肉（建議用梅花絞肉） | 楊桃 A02-127、龜甲萬 617：「豬絞肉」 |
| `onion-minced-pork` | 豬後腿絞肉（選用低脂絞肉） | 豬絞肉（選用低脂絞肉，建議用後腿絞肉） | 愛料理 253146：「低脂豬絞肉」「豬絞肉」 |
| `scallion-beef` | 牛里肌肉（切片） | 牛肉（切片，建議用牛里肌） | 楊桃 A01-1253：「牛肉 180公克」；A01-1206：「牛肉絲」 |
| `pickled-mustard-beef-soup` | 牛腱（切成約 6 × 3 公分塊） | 牛肉（切成約 6 × 3 公分塊，建議用牛腱） | 楊桃 A01-0530：「牛肉 300公克」 |
| `lettuce-chicken-sang-choy-bao` | 雞胸肉（切丁） | 雞肉（切丁，建議用雞胸肉） | 楊桃 A03-422：「雞肉 100公克」 |
| `shiitake-chicken-soup` | 帶骨雞腿肉（剁塊） | 雞肉（剁塊，建議用帶骨雞腿肉） | 楊桃 A03-2543：「雞肉 1200公克」；A03-2517：「雞肉 700公克」 |

`minced-pork-noodles`、`dry-fried-green-beans` 來源只寫「絞肉」，材料名用「豬絞肉」：這是 PR #90（`0966671`）加部位前的原名，也與站主範例 `rice-wine-pork-meatballs` 一致。`cabbage-rice` 來源寫「肉絲」，同理用「豬肉絲」。

## 來源有寫部位，未改

`bamboo-shoot-pork`（五花肉片）、`beef-curry`（牛臀肉）、`braised-pork-belly`、`garlic-pork-slices`、`hakka-stir-fry`（五花肉）、`braised-pork-meatballs`（後腿絞肉）、`chili-pork`（梅花肉、帶皮肥肉）、`japanese-pork-cutlet`（小里肌排）、`luosong-soup`（牛肋條）、`pork-kimchi-hotpot`（三層肉）、`radish-pork-rib-soup`（豬小排）、`salt-crispy-chicken`（雞胸肉）、`salt-pepper-chicken-thigh`（去骨雞腿排）、`sesame-oil-chicken`（土雞）、`sesame-oil-pork-jowl`（松阪豬肉）、`shiitake-chicken-congee`（雞腿肉，愛料理 282575 重抓確認）、`sweet-and-sour-pork-tenderloin`（里肌肉）、`teriyaki-chicken`（帶皮去骨雞腿肉）、`three-cup-chicken`（龜甲萬 214：土雞腿肉）、`tomato-beef-noodle-soup`（嫩肩牛肉）、`yogurt-pork-stew`（楊桃 A02-3056 重抓：豬後腿肉）。

材料名本來就是來源寫法、沒有部位：`ginger-duck`（鴨肉）、`pork-thick-soup`（肉羹、雞骨）、`creamy-pumpkin-soup`（培根）、`daylily-pork-stir-fry`（瘦肉，楊桃 F03-0057 重抓確認）、`bitter-melon-pork-rib-soup`（排骨）、`chawanmushi`（雞肉）。後兩道的來源頁沒有快取也未重抓，因材料名不含部位，不影響本次判斷。

## 未能確認、未改

- `kung-pao-chicken`「去骨雞腿肉（去皮，切成一口大小的丁）」：主來源 chinasichuanfood.com 重抓回 HTTP 403（安全驗證頁），快取檔也是驗證頁，無法確認原文是否寫 chicken thigh。其餘核准來源是食安溫度表與李錦記醬油頁，與部位無關。
- `braised-chicken-legs`「雞腿（帶骨棒棒腿）」：材料名與來源（愛料理 131794：「雞腿 5支」）一致；note 的「帶骨棒棒腿」是補充部位，但不是「建議用<部位>」格式。是否改成「建議用棒棒腿」請站主決定。

## 測試

`tests/`、`e2e/`、`src/` 沒有斷言上述舊名稱的地方（含 `tests/fixtures`）。食材條目沒有肉類，不受影響。
