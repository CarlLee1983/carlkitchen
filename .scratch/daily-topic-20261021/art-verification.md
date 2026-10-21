# 2026-10-21 專題插畫紀錄

- 題目識別值：`aromatic-timing`。只製作本篇封面與三張正文教學圖，無既有圖片改作。
- 工具：built-in image_gen；每次一張，循序執行，沒有並行超量或 CLI/API fallback。
- 來源材料核對：`garlic-broccoli` 大蒜切片；`clam-ginger-soup` 薑切細絲；`three-cup-chicken` 帶骨雞腿肉剁小塊、薑片、整瓣去皮大蒜、辣椒片、九層塔挑去粗莖。
- 原始 PNG 與 QA 圖不進版控：`/workspace/scratch/d935b46a4408/aromatic-art-originals/`。
- 轉檔：repo `.claude/skills/recipe-making/scripts/img.mjs webp`，PATH 指向 `kitchen-tools/webp/usr/bin`，cwebp 1.5.0，q=80；腳本以 dwebp 完整解碼驗證。

| 圖 | 生成次數 | 採用原圖 | WebP bytes | 規格與實際目視 |
| --- | --- | --- | --- | --- |
| hero | 2 | hero-final.png | 227448 | 1536×1024，市場巷道、淡色天空與遠屋、綠棚；前景只留大蒜籃與青蔥束，無字／人臉／餐具。64×43 px 實際縮圖仍見綠棚大色塊與前景兩團。首版過細並多出薑、九層塔，未採用。 |
| garlic-slices | 1 | garlic-slices.png | 185972 | 1536×1024，薄油中淡金黃蒜片，未畫蔬菜、肉與深炸油池；鍋具全在畫框內，握柄接近上右邊界但沒有裁掉。 |
| ginger-forms | 1 | ginger-forms.png | 150258 | 1536×1024，木砧板上薑絲、薄薑片和帶皮薑塊，組別分明；無刀、額外材料或文字。 |
| basil-finish | 2 | basil-finish-final.png | 127254 | 1536×1024，完整深色炒鍋，帶骨雞肉小塊裹褐色醬汁、整瓣蒜、薑片、辣椒片及綠九層塔；鍋底無大量湯汁。首版上方鍋緣切邊，已重製排除。 |

四張 final WebP 均以 metadata 確認 1536×1024、RGB、無透明，個別小於 300 KiB。已讀取每張原圖完整像素，並檢視 final WebP 四圖合板與各圖 700×500 區域裁切合板，未見文字浮水印、人物、擬人表情、意外食材或破損。採用的圖文 alt 與當前 topic.md 一致，無需變更文章文字。本驗收是資產本身，非文章桌機／手機實頁驗收。

## 最終提示詞

### hero

Original cookbook editorial landscape illustration, 1536x1024 horizontal 3:2. Very minimal sketchbook drawing: visible loose thin black ink contours with only a few light transparent watercolor washes on paper. Simplified sparse shapes, absolutely NOT a detailed painting. Restrained low-saturation pale gray-blue, muted sage green, straw yellow. Scene is a generic neighborhood vegetable-market lane in Taiwan, no recognizable landmark. THREE DEPTH LAYERS: foreground lower left exactly two objects, one small basket containing garlic bulbs and one loose bunch of scallions, together occupy only 15 percent of image. NO ginger, NO basil, no extra foreground items. Middle ground one simple stall with blank pale sage-green awning and only a few simplified produce crates; open quiet lane. Background a few low gray rooftops under pale blue-gray washed sky. Horizon upper third; sky filled with pale wash not blank paper. Large clearly separate simple color masses; no dense foliage, trees or finely textured architecture. All objects outlined with slightly uneven fine ink. No people. No text, lettering, numbers, labels, logos, watermark, signboards, utensils or borders. Keep the entire basket and scallion bunch inside frame with generous margins. Calm modern cookbook illustration, not photorealistic.

### garlic-slices

Use case: illustration-story. Asset: original instructional cookbook illustration. Landscape 3:2, 1536x1024. Warm hand-drawn ink and watercolor: visible loose fine black outlines, slightly uneven linework, thin transparent watercolor washes, muted natural colors and warm grays, visible paper grain; calm minimal modern Japanese cookbook style. Not photorealistic, not 3D. Plain warm off-white background close #F7F6F3, generous empty space, no scene or tabletop. Single shallow dark-gray nonstick frying pan seen at 45 degree overhead, whole pan including short handle completely inside frame. Pan occupies 60 percent of image. In pan a very thin film of oil and a modest scatter of separate thin oval garlic slices just turned pale golden, not dark brown, not minced, no whole cloves. This depicts low-heat garlic preparation before vegetables are added. No vegetables, no meat, no deep frying, no large oil pool. No burner, no flame, no utensils, no people, no hands. No text, labels, letters, numbers, logos, watermarks, anthropomorphic faces or border.

### ginger-forms

Use case: illustration-story. Original instructional cookbook illustration. Landscape 3:2 1536x1024. Warm hand-drawn fine ink contours with thin transparent watercolor washes, slightly uneven lines, muted ginger yellow and warm grays, visible paper grain. Calm minimal modern Japanese cookbook illustration, not photorealistic, not 3D, not glossy. Plain off-white paper background #F7F6F3, generous surrounding negative space, no tabletop or scenery. Top-down view of one simple light wooden cutting board, fully inside frame and occupying about 65 percent. On board exactly three separate groups with space between them: on left a small neat mound of very thin long ginger shreds, on right a small overlapping group of thin oval ginger slices, and above a small knobbly piece of ginger root with pale beige skin and one yellow cut end. Ginger shreds and slices must be clearly different shapes. No other ingredients, no knives, no utensils, no hands, no people, no text, labels, letters, numbers, logos, watermarks, faces or border.

### basil-finish

Minimal cookbook step illustration, 1536x1024 landscape. Entire SINGLE DARK WOK centered at SMALL SCALE inside an empty off-white #F7F6F3 paper canvas: wok occupies only 60 percent canvas width, absolutely keep 20 percent BLANK MARGIN ALL AROUND including ABOVE and BELOW, both handles fully visible. Hand-drawn fine black ink contours, slightly uneven lines, only light transparent muted watercolor washes showing paper grain, no glossy highlights, no photorealism, no 3D, few details, calm Japanese cookbook illustration. View from 45 degrees overhead. Inside wok, a modest shallow pile of small bone-in chicken thigh chunks coated in brown soy glaze, some small visible bone cross sections. Between chicken: whole peeled garlic cloves, thin ginger slices, small red chili slices. A few fresh muted-green basil leaves just added over chicken, coarse stems removed. Very little thick sauce on bottom; not soup. No whole legs or wings. No other ingredients. No burner, flame, utensils, hands, people, table, background scene, text, numbers, labels, logos, watermarks, faces or border.

