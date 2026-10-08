# 食材條目擴充：候選來源送審

Status: 站主已核准（2026-10-08，第一節全部照建議；綠豆芽、糖延後）

範圍：已發布菜譜用到、尚無條目的 34 項蔬菜、辛香料、調味料。下列網址皆由研究代理實際開啟並核對內容；食農平臺頁面的挑選、保存、產期多畫在圖片裡，代理已下載圖檔逐張判讀（標「圖」）。「食農」指 `fae.moa.gov.tw/map/food_item.php`，`AS01` 認識、`AS02` 在地特色、`AS03` 產地與產期、`AS06` 挑選與保存、`AS07` 料理加工。

核准後每項先以草稿（`draft: true`）寫入，來源紀錄只列實際採用的網址。

## 一、需要站主決定的通則

1. **非政府或非臺灣來源**：
   - 建議採用：香港消委會〈調味品儲存方法〉（保存通則）、台灣事實查核中心（台鹽、台糖說明）、食力（台糖人員受訪）。
   - 建議不採用：TVBS（豆芽菜保存，菜販口述）、元氣網（書摘，含療效）、農業易遊網單一農場專欄。
2. **產期口徑衝突**：建議以食農 `AS03` 的文字為準，其他來源的說法寫進 `scope` 說明。適用南瓜、紅蔥頭、辣椒、芹菜、青江菜、玉米、四季豆。
3. **調味料開封後要不要冷藏**：品牌之間說法不一（醋、番茄醬、白胡椒粉）。建議依技能規範寫成「點名產品＋提醒依實際包裝標示」，不寫成通則。
4. **食藥署〈生鮮蔬果建議儲運溫度〉表**：這是物流儲運條件。建議只用於定性敘述（例如九層塔、辣椒怕低溫），不引用天數；辣椒那一列 0–5℃ 的數字與冷害溫度互相矛盾，不採用。
5. **農曆月份**（韭菜最佳賞味期、紅蔥頭收成）：建議照原文寫「農曆」，不換算成國曆。
6. **識別值待定**：太白粉（建議 `potato-starch`，條目說明市售原料可能是樹薯或馬鈴薯，須看標示）、九層塔（建議 `thai-basil`）。
7. **建議延後**：
   - 綠豆芽：沒有政府的保存與產地來源，而 schema 規定蔬菜必須有產期。
   - 糖：沒有料理用途來源，也沒有台糖產品頁。
8. **青江菜、小白菜**：共用食農 id=28「不結球白菜」，建議分成兩個條目，各自補上農業兒童網或農業知識入口網的專頁。

## 二、蔬菜（vegetable）

### 紅蘿蔔 `carrot`
- 食農 id=100 AS03／AS06（圖）／AS07：臺南、雲林、彰化合計約 99%；主要產期 11–4 月；挑選、冷藏、冷凍皆有天數；刷洗即可，不必削皮。
- 限制：AS06 轉引自自由時報。

### 番茄 `tomato`
- 食農 id=87 AS03／AS06／AS07：全年生產、12–4 月盛產；熟果不洗、裝袋冷藏，未熟果放陰涼處後熟；用流動水加軟毛刷清洗。
- 限制：保存沒有給天數。

### 白蘿蔔 `daikon`
- 食農 id=133 AS03（圖）／AS06（圖）／AS07：產季圖卡標示 10 月至翌年 3 月，另依產地分列各自的品種與產季；部位用途（上段生食、中段煮湯或炒、下段醃漬）。
- 限制：各產地月份與圖卡的全國產期不同，`production` 以圖卡為主，各產地月份寫進 `scope`。原文作「臺北淡水」。

### 洋蔥 `onion`
- 食農 id=73 AS03／AS06／AS07：12–4 月鮮甜期，各產區月份；放陰涼乾燥處、不冰；先切根再泡水可減少流淚。

### 大白菜 `napa-cabbage`
- 食農 id=94 AS03／AS06／AS07：漳浦白菜 4–11 月、山東白菜 11–3 月盛產；整顆、剖半、燙過各有保存天數；葉柄黑點不影響食用。

### 茄子 `eggplant`
- 食農 id=111 AS03／AS06／AS07：全年生產、5–11 月盛產，屏東約占一半；防止切開後變色的做法。

### 絲瓜 `loofah`
- 食農 id=96 AS03／AS06／AS07，農業知識入口網〈絲瓜主題館〉 https://kmweb.moa.gov.tw/subject/subject.php?id=24748
- 食農 AS03 產季圖卡標示盛產期 5 月至 9 月；文字另有「臺南以北晚春至夏季、高屏秋冬至早春」的定性說法。`production.months` 用圖卡月份，定性說法寫進 `scope`。

### 小黃瓜 `cucumber`
- 食農 id=99 AS03／AS06／AS07（頁名「胡瓜」）。
- 限制：產期頁只給栽培適期，不是採收月份。建議 `scope` 註明這一點。

### 青江菜 `bok-choy`
- 食農 id=28 AS01／AS03／AS06／AS07
- 農業兒童網〈青江菜〉 https://kids.moa.gov.tw/theme_data.php?theme=kids_school&sub_theme=food&type=A01&id=335 ：最佳收穫期 6–7、10–11 月；要剝開蒂頭清洗。
- 食農〈3 項清洗步驟〉 https://fae.moa.gov.tw/theme_data.php?theme=news&sub_theme=hot_news&id=1766
- 衝突：食農寫全年，兒童網寫最佳收穫期。

### 小白菜 `xiao-bai-cai`
- 食農 id=28（同上）
- 農業兒童網〈小白菜〉 https://kids.moa.gov.tw/theme_data.php?theme=kids_school&sub_theme=food&type=A01&id=61
- 農業知識入口網生產地圖 https://kmweb.moa.gov.tw/theme_data.php?theme=production_map&id=166 ：冬季除北部略少外，全年生產；冷藏 2–3 天。
- 食農清洗步驟 id=1766（同上）

### 四季豆 `green-beans`
- 食農 id=119 AS01／AS03／AS06（圖）／AS07：產期依地區分列；冷藏 7–10 天；撕掉筋絲；不可生吃。
- 限制：說明四季豆與市場上的「菜豆」（豇豆）不同；播種月份與產期月份要分清楚。

### 南瓜 `pumpkin`
- 食農 id=405 AS03／AS06（圖）／AS07
- 農業兒童網〈南瓜〉 https://kids.moa.gov.tw/theme_data.php?theme=kids_school&sub_theme=food&type=D01&id=313
- 衝突：盛產期有三種說法（3–11 月、秋冬、3–10 月），常溫保存有兩種（約 2 個月、3–6 個月）。依通則 2，以 AS03 為準。

### 香菇 `shiitake`（鮮香菇與乾香菇合併一個條目）
- 食農 id=156 AS03／AS06（圖）／AS07：冬菇 1–5 月、夏菇 5–8 月；乾香菇開封後密封冷藏或冷凍，可放一年。
- 農業知識入口網〈香菇主題館〉 https://kmweb.moa.gov.tw/subject/subject.php?id=35701
- 農業E報〈菇菇的保存挑選小教室〉 https://epost.moa.gov.tw/theme_data.php?theme=epost&sub_theme=photo&id=413 ：鮮香菇以紙巾包覆冷藏 7–10 天。
- 食農〈菇類要洗嗎？〉 https://fae.moa.gov.tw/theme_data.php?theme=topics&sub_theme=knowledge&id=4772
- 缺口：泡發的時間與水溫，只寫「泡冷水至軟化」。

### 韭菜 `garlic-chives`
- 食農 id=149 AS03／AS06（圖）／AS07：全年生產，農曆二月最好吃；韭菜花 8–10 月；直立冷藏約 7 天。

### 青椒 `green-bell-pepper`
- 食農 id=82（甜椒）AS01／AS03／AS06／AS07
- 農業知識入口網生產地圖 https://kmweb.moa.gov.tw/theme_data.php?theme=production_map&id=41
- 農業兒童網〈甜椒辣椒同家族〉 https://kids.moa.gov.tw/theme_data.php?theme=kids_school&sub_theme=food&type=A01&id=51
- 限制：產期是甜椒整體的資料（12–5 月盛產），`scope` 要註明。

### 玉米 `sweet-corn`
- 食農 id=151 AS03／AS06（圖）／AS07：9–5 月盛產；甜玉米放常溫，糖分流失很快。
- 臺南區農業專訊 122 期 https://book.tndais.gov.tw/Magazine/mag122/122-2.pdf
- 限制：食農頁講的是食用玉米整體，挑選段落轉引自由時報。

### 綠竹筍 `green-bamboo-shoot`
- 食農 id=97 AS01／AS03／AS06（圖）／AS07：5–10 月產期，6 月與 8 月是高峰；帶殼煮過再冷藏；不可生吃。
- 缺口：冷藏天數。只適用綠竹筍。

### 綠豆芽 `mung-bean-sprouts`（建議延後）
- 農糧署〈豆芽菜小教室〉 https://fae.moa.gov.tw/theme_data.php?theme=topics&sub_theme=knowledge&id=4553
- 缺口：保存方法與產地都沒有政府來源。

## 三、辛香料（aromatic）

### 紅蔥頭 `shallot`
- 食農 id=408 AS02／AS03／AS07：油蔥酥做法；臺南占 9 成以上。
- 國產農漁畜產品教材 PDF https://fae.moa.gov.tw/files/topics/3008/A02_2.pdf ：挑選；網袋吊掛陰涼處 1–3 個月；切片冷凍 1 個月內用完。
- 農糧署南區分署 https://srb.afa.gov.tw/index.php?code=list&flag=detail&ids=3371&article_id=21617
- 衝突：收成期有三種說法；油蔥酥的火候有兩種說法。

### 辣椒 `chili-pepper`
- 農業知識入口網〈越辣越吃香－辣椒〉 https://kmweb.moa.gov.tw/theme_data.php?theme=news&sub_theme=agri_life&id=53871 ：挑選；12–6 月盛產。
- 食農〈臺灣常見辣椒排行榜〉 https://fae.moa.gov.tw/theme_data.php?theme=topics&sub_theme=knowledge&id=1845 ：處理時戴手套；用不完的冷凍。
- 農業知識入口網生產地圖 https://kmweb.moa.gov.tw/theme_data.php?theme=production_map&id=14
- 衝突：產期一說 12–6 月，一說全年。

### 香菜 `coriander`
- 農業兒童網〈香菜〉 https://kids.moa.gov.tw/theme_data.php?theme=kids_school&sub_theme=food&type=A01&id=348 ：根部泡水冷藏 2–3 週；中秋到早春是產季。不採用頁面上的「解毒」說法。
- 農業E報〈香菜火鍋篇〉 https://fae.moa.gov.tw/theme_data.php?theme=news&sub_theme=hot_news&id=547
- 衝突：主產地有兩種說法。

### 九層塔 `thai-basil`
- 食農〈羅勒家族〉 https://fae.moa.gov.tw/theme_data.php?theme=topics&sub_theme=knowledge&id=1835
- 農試所常見問答 https://www.tari.gov.tw/faq/index-1.asp?Parser=27%2C5%2C30%2C%2C%2C%2C8005%2C87%2C%2C%2C%2C%2C%2C%2C%2C5 ：變黑是氧化；建議 15℃ 以上貯藏。
- 農業知識入口網專家回覆（臺中區農業改良場） https://kmweb.moa.gov.tw/knowledge_view.php?id=15817 ：12℃ 以下會冷害；冷凍前先殺菁。只採用專家回覆，不採用網友回覆。
- 食農〈九層塔青醬〉 https://fae.moa.gov.tw/theme_data.php?theme=topics&sub_theme=recipe&id=4774
- 臺中市果菜公司 https://www.fyfv.taichung.gov.tw/1938539/post ：挑選；全年生產。

### 芹菜 `celery`（本地芹菜）
- 農業知識入口網生產地圖 https://kmweb.moa.gov.tw/theme_data.php?theme=production_map&id=168 ：10–4 月產期。
- 臺中區農業改良場〈彰化特色蔬菜～芹菜〉 https://kmweb.moa.gov.tw/knowledgebase.php?func=2&type=2&id=368977
- 農糧署〈選購蔬菜要領〉 https://www.afa.gov.tw/cht/index.php?code=list&ids=656
- 缺口：家庭保存方法、摘葉與去老筋的處理。建議 `storage` 依技能規範寫「來源未提供家庭保存方法」，並以食藥署表定性說明芹菜適合低溫。

## 四、調味料（seasoning）

共用來源：
- 香港消委會〈調味品儲存方法〉 https://www.consumer.org.hk/tc/article/526-condiment-storage/526_condiment_storage
- 食藥署〈食品過敏原標示說明〉（既有）

### 鹽 `salt`
- 衛福部〈包裝食用鹽品加不加碘清楚標〉 https://www.mohw.gov.tw/cp-16-9718-1.html
- 台灣事實查核中心 https://tfc-taiwan.org.tw/articles/11167
- 台鹽線上購〈無碘鹽〉 https://www.taiyen.tw/products/23
- 缺口：用途只有「烹調、醃漬」這類包裝文字。

### 香油 `sesame-oil`
- 元福麻油〈小磨香油〉 https://www.tw-food.com/oil-white-sesameoil.html
- 臺南區農業改良場〈胡麻加工用途〉 https://kmweb.moa.gov.tw/subject/subject.php?id=41283
- 過敏原：芝麻，依食藥署標示說明。
- 缺口：保存只有消委會的通則。

### 黑麻油 `black-sesame-oil`
- 元福麻油〈優級麻油〉 http://www.tw-food.com/oil-black-sesameoil-gifted.html
- 東和製油〈黑芝麻油〉 https://www.dongheoil.com/products/black-sesame-oil
- 臺南區農業改良場（同上）
- 限制：品牌頁的「冷壓」說法不採用。

### 白胡椒粉 `white-pepper`
- 小磨坊〈純白胡椒粉〉 https://www.tomax.com.tw/product/ins.php?index_id=69&index_m1_id=22&index_m2_id=35
- 小磨坊〈調和白胡椒粉〉 https://www.tomax.com.tw/product/ins.php?index_id=93&index_m1_id=22&index_m2_id=36 ：含麩質，可對照說明挑選時要看成分是否純胡椒。

### 白醋 `rice-vinegar`
- 萬家香〈珍釀白醋〉 https://www.wanjashan.com.tw/product_detail.php?P_ID=20150609030
- 工研〈白醋〉 https://kongyen.com.tw/product/1110/
- 十全〈米醋〉 https://shih-chuan.com.tw/zh/products/product/rice-vinegar-500ML
- 衝突：開封後要不要冷藏，各來源不一致（十全自家兩頁也不一致），依通則 3 處理。

### 烏醋 `black-vinegar`
- 工研〈烏醋〉 https://kongyen.com.tw/product/2110/
- 萬家香〈特級烏醋〉 https://www.wanjashan.com.tw/product_detail.php?P_ID=20150609037

### 味醂 `mirin`
- 全國味淋協會（日本） https://www.honmirin.org/knowledge/ ：本味醂酒精約 14%，味醂風調味料不到 1%。
- 萬家香〈味醂〉 https://www.wanjashan.com.tw/product_detail.php?P_ID=20150609025 ：成分含酒精。
- 十全〈味醂調味料〉 https://shih-chuan.com.tw/zh/products/product/mirin-500ML ：成分沒有酒精。
- 酒精提醒：寫明依各產品成分表判斷。

### 太白粉 `potato-starch`（識別值待定）
- 衛福部〈太白粉標示規定〉 https://www.mohw.gov.tw/cp-16-9681-1.html ：須標示實際原料。
- 仙知味〈太白粉〉 http://www.sanwi.com.tw/product.php?act=view&id=6 ：樹薯澱粉；用於勾芡、沾炸。
- 食力〈馬鈴薯變太白粉〉 https://www.foodnext.net/science/knowledge/paper/5098271023 ：冷水調勻後加入熱菜勾芡。

### 味噌 `miso`
- 十全〈原味味噌〉 https://shih-chuan.com.tw/zh/products/product/original-miso-500g
- 工研〈鄉味噌〉 https://kongyen.com.tw/product/3152/ ：含食用酒精。
- 工研〈香醇味噌〉 https://kongyen.com.tw/product/3310/ ：含魚製品。
- 十全〈味噌烏龍麵〉 https://shih-chuan.com.tw/zh/recipes/miso-udon-noodle-recipe ：味噌在鍋中慢慢抹開化開。

### 番茄醬 `ketchup`
- 可果美〈蕃茄醬柔軟瓶〉 https://www.kagome.com.tw/tw/product/食品/蕃茄醬系列/蕃茄醬柔軟瓶
- 十全〈番茄醬〉 https://shih-chuan.com.tw/zh/products/product/tomato-ketchup-580g

### 辣豆瓣醬 `chili-bean-paste`
- 明德食品〈辣豆瓣醬〉 https://www.mingteh.com.tw/products/broad-bean-paste-with-chili ：含蠶豆，標示蠶豆症患者禁止食用；過敏原為大豆、芝麻、小麥。
- 十全〈富山麻油辣豆瓣〉 https://shih-chuan.com.tw/zh/products/product/fushan-sesame-oil-spicy-bean-paste-640g ：不含蠶豆。
- 缺口：處理方法（例如先下鍋炒香）。

### 糖 `sugar`（建議延後）
- 只有食力與台灣事實查核中心的報導，沒有台糖產品頁，也沒有用途來源。

## 五、審稿後補核准（2026-10-08，PR #65）

站主核准以下事項：

- **補列來源**：十全〈米醋使用指南〉 https://shih-chuan.com.tw/zh/news/rice-vinegar-guide （用於 `rice-vinegar`）、工研〈味醂〉 https://kongyen.com.tw/product/18791/ （用於 `mirin`）。
- **白蘿蔔產地**：來源原文「臺北淡水」，條目改寫為現行行政區「新北市淡水」。
- **相關菜譜的取捨**：
  - 鹽、香油、白胡椒粉各只連約 6 道代表菜譜。
  - 黑麻油只連三杯雞；蒸蛋只寫「麻油」，分不出種類，所以不連。
  - 綠竹筍暫不連菜譜，因為酸辣湯只寫「熟竹筍」。
- **洋蔥最佳賞味期**：保留 `bestFlavor`，依據是 AS03 產季圖卡直接印著「最佳賞味期 12月→隔年4月」。
