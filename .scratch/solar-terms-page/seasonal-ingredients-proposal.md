# 節氣當令食材建議：工單 07

**狀態：待站主確認。** 這份清單只是建議，沒有寫進 `content/solar-terms/`；每個節氣的 `seasonalIngredients` 目前都是空陣列。站主勾選後再寫入節氣資料。

## 怎麼選的

- 只看 `content/ingredients/*/ingredient.yaml` 中 `draft: false` 的條目，依據只有條目的 `season.production[].months` 與 `season.scope` 文字，不另找產期來源。
- 節氣取交節的大約國曆日期（例如寒露約 10 月 8 日），日期落在條目寫明的產期或盛產期月份內，才列入。月份範圍以整月計，例如「10 月至翌年 5 月」含 10 月 1 日到 5 月 31 日。
- 交節日期每年會差一兩天，落在月份邊界附近的節氣以大約日期判斷，個別請站主再看。
- 寧可不列：產期寫「全年」而沒有盛產月份、兩個品種或產地輪替使全年都有、只寫栽培或播種月份而不是採收月份的條目，都不列進任何節氣（見文末〈未列入的條目〉）。

## 依據（條目產期文字）

以下摘錄各條目的產期文字，表格中只寫識別值。

| 識別值 | 名稱 | 條目產期文字 | 列入的節氣 |
| --- | --- | --- | --- |
| `broccoli` | 青花菜 | 條目產期文字：「10 月至翌年 5 月」（臺灣國產；雲林為主要產地） | 寒露至小滿（16 個） |
| `carrot` | 紅蘿蔔 | 條目產期文字：「11 月至翌年 4 月」（臺南市、雲林縣、彰化縣） | 立冬至穀雨（12 個） |
| `celery` | 芹菜 | 條目產期文字：「10 月至翌年 4 月」（彰化、雲林、嘉義、高雄、屏東） | 寒露至穀雨（14 個） |
| `chili-pepper` | 辣椒 | 條目產期文字：「12 月至翌年 6 月盛產」 | 大雪至夏至（14 個） |
| `coriander` | 香菜 | 條目產期文字：「中秋節後到清明節前盛產」 | 寒露至春分（12 個）；中秋最晚約在國曆 10 月上旬，所以從寒露起算，清明當天不列 |
| `daikon` | 白蘿蔔 | 條目產期文字：「10 月至翌年 3 月」 | 寒露至春分（12 個） |
| `eggplant` | 茄子 | 條目產期文字：「全年生產，5 月至 11 月盛產」 | 立夏至小雪（14 個），依盛產期 |
| `green-bell-pepper` | 青椒 | 條目產期文字：「全年生產；12 月至翌年 5 月盛產」 | 大雪至小滿（12 個），依盛產期；條目註明來源是甜椒整體的資料 |
| `loofah` | 絲瓜 | 條目產期文字：「5 月至 9 月盛產」 | 立夏至秋分（10 個） |
| `onion` | 洋蔥 | 條目產期文字：彰化縣、雲林縣「12 月進入產季」，高雄市「1 月底至 3 月初」，屏東縣「3 月至 4 月盛產」；scope 寫「12 月至翌年 4 月的國產洋蔥最鮮甜」 | 大雪至穀雨（10 個） |
| `shallot` | 紅蔥頭 | 條目產期文字：「2 月至 3 月收成（以安南種為例）」 | 立春、雨水、驚蟄、春分（4 個）；月份只是安南種的例子，請站主斟酌 |
| `shiitake` | 香菇 | 條目產期文字：「冬菇 1 月中旬至 5 月中旬；夏菇 5 月至 8 月中旬」 | 大寒至立秋（14 個）；小寒（約 1 月 6 日）在 1 月中旬前，不列 |
| `sweet-corn` | 玉米 | 條目產期文字：「全年生產；9 月至翌年 5 月盛產」 | 白露至小滿（18 個），依盛產期；條目註明是食用玉米整體的資料 |
| `tomato` | 番茄 | 條目產期文字：「12 月至翌年 4 月盛產」 | 大雪至穀雨（10 個） |
| `water-spinach` | 空心菜 | 條目產期文字：「全年有出產；4 月至 9 月盛產」 | 清明至秋分（12 個），依盛產期 |

## 每個節氣的建議

括號內是建議項數。

### 春季

- [ ] 立春 `lichun`（12）：`broccoli`、`carrot`、`celery`、`chili-pepper`、`coriander`、`daikon`、`green-bell-pepper`、`onion`、`shallot`、`shiitake`、`sweet-corn`、`tomato`
- [ ] 雨水 `yushui`（12）：`broccoli`、`carrot`、`celery`、`chili-pepper`、`coriander`、`daikon`、`green-bell-pepper`、`onion`、`shallot`、`shiitake`、`sweet-corn`、`tomato`
- [ ] 驚蟄 `jingzhe`（12）：`broccoli`、`carrot`、`celery`、`chili-pepper`、`coriander`、`daikon`、`green-bell-pepper`、`onion`、`shallot`、`shiitake`、`sweet-corn`、`tomato`
- [ ] 春分 `chunfen`（12）：`broccoli`、`carrot`、`celery`、`chili-pepper`、`coriander`、`daikon`、`green-bell-pepper`、`onion`、`shallot`、`shiitake`、`sweet-corn`、`tomato`
- [ ] 清明 `qingming`（10）：`broccoli`、`carrot`、`celery`、`chili-pepper`、`green-bell-pepper`、`onion`、`shiitake`、`sweet-corn`、`tomato`、`water-spinach`
- [ ] 穀雨 `guyu`（10）：`broccoli`、`carrot`、`celery`、`chili-pepper`、`green-bell-pepper`、`onion`、`shiitake`、`sweet-corn`、`tomato`、`water-spinach`

### 夏季

- [ ] 立夏 `lixia`（8）：`broccoli`、`chili-pepper`、`eggplant`、`green-bell-pepper`、`loofah`、`shiitake`、`sweet-corn`、`water-spinach`
- [ ] 小滿 `xiaoman`（8）：`broccoli`、`chili-pepper`、`eggplant`、`green-bell-pepper`、`loofah`、`shiitake`、`sweet-corn`、`water-spinach`
- [ ] 芒種 `mangzhong`（5）：`chili-pepper`、`eggplant`、`loofah`、`shiitake`、`water-spinach`
- [ ] 夏至 `xiazhi`（5）：`chili-pepper`、`eggplant`、`loofah`、`shiitake`、`water-spinach`
- [ ] 小暑 `xiaoshu`（4）：`eggplant`、`loofah`、`shiitake`、`water-spinach`
- [ ] 大暑 `dashu`（4）：`eggplant`、`loofah`、`shiitake`、`water-spinach`

### 秋季

- [ ] 立秋 `liqiu`（4）：`eggplant`、`loofah`、`shiitake`、`water-spinach`
- [ ] 處暑 `chushu`（3）：`eggplant`、`loofah`、`water-spinach`
- [ ] 白露 `bailu`（4）：`eggplant`、`loofah`、`sweet-corn`、`water-spinach`
- [ ] 秋分 `qiufen`（4）：`eggplant`、`loofah`、`sweet-corn`、`water-spinach`
- [ ] 寒露 `hanlu`（6）：`broccoli`、`celery`、`coriander`、`daikon`、`eggplant`、`sweet-corn`
- [ ] 霜降 `shuangjiang`（6）：`broccoli`、`celery`、`coriander`、`daikon`、`eggplant`、`sweet-corn`

### 冬季

- [ ] 立冬 `lidong`（7）：`broccoli`、`carrot`、`celery`、`coriander`、`daikon`、`eggplant`、`sweet-corn`
- [ ] 小雪 `xiaoxue`（7）：`broccoli`、`carrot`、`celery`、`coriander`、`daikon`、`eggplant`、`sweet-corn`
- [ ] 大雪 `daxue`（10）：`broccoli`、`carrot`、`celery`、`chili-pepper`、`coriander`、`daikon`、`green-bell-pepper`、`onion`、`sweet-corn`、`tomato`
- [ ] 冬至 `dongzhi`（10）：`broccoli`、`carrot`、`celery`、`chili-pepper`、`coriander`、`daikon`、`green-bell-pepper`、`onion`、`sweet-corn`、`tomato`
- [ ] 小寒 `xiaohan`（10）：`broccoli`、`carrot`、`celery`、`chili-pepper`、`coriander`、`daikon`、`green-bell-pepper`、`onion`、`sweet-corn`、`tomato`
- [ ] 大寒 `dahan`（11）：`broccoli`、`carrot`、`celery`、`chili-pepper`、`coriander`、`daikon`、`green-bell-pepper`、`onion`、`shiitake`、`sweet-corn`、`tomato`

冬春節氣多達 10 到 12 項，因為多數條目是冷涼季節的蔬菜；若站主希望每格精簡，可以只留盛產期較集中的條目。

## 未列入的條目

已發布且有產期欄的條目中，以下不列進任何節氣：

| 識別值 | 條目產期文字 | 不列原因 |
| --- | --- | --- |
| `bok-choy` | 「全年生產」 | 全年，沒有盛產月份；scope 另提的最佳收穫期是不同口徑，僅供參考 |
| `xiao-bai-cai` | 「全年生產」 | 全年，來源沒有給盛產月份 |
| `thai-basil` | 「全年」 | 全年，來源沒有盛產月份 |
| `garlic-chives` | 「全年生產」；韭菜花「8 月至 10 月為主要產季」 | 韭菜全年；韭菜花是另一部位，不能代表韭菜條目 |
| `cabbage` | 平地「10 月至翌年 5 月」、高冷地「5 月至 11 月」 | 兩地輪替全年都有，列進每個節氣沒有區別；若站主想只用平地產期，可列寒露至小滿 |
| `napa-cabbage` | 漳浦白菜「4 月至 11 月盛產」、山東白菜「11 月至翌年 3 月盛產」 | 兩品種輪替全年都有 |
| `cucumber` | 各地區「適合栽培」期間 | scope 明寫是栽培適期，不是採收月份 |
| `green-beans` | 高屏平地「秋季至初春」栽培、中部平地播種月份、南投山區「6 月至 9 月為主要產期」 | 平地只有栽培或播種期；只有山區有產期，單列夏季會誤導，因為 scope 寫一年四季都有出產 |
| `pumpkin` | 「秋、冬作為主要生產季節」 | 「作」是栽培季節，沒有月份；同頁圖卡的 3 月至 11 月與文字口徑不同 |

沒有產期欄的已發布條目（調味料與乾貨，以及 `garlic`、`ginger`、`scallion`）不列。`green-bamboo-shoot`、`okra`、`vegetarian-oyster-sauce` 仍是草稿，不列。
