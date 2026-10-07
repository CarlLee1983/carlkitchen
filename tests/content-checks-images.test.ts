import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  checkHeroAlt,
  checkImageFile,
  collectImageRefs,
  MAX_IMAGE_BYTES,
} from "../src/content-checks/images.ts";
import { parseRecipe } from "../src/content-checks/recipes.ts";

const ref = { field: "hero", src: "./hero.webp", alt: "成品" };
const good = { format: "webp", width: 1536, height: 1024, bytes: 1000 };

describe("checkImageFile", () => {
  it("WebP、1536×1024、不超過 300 KB 即通過", () => {
    assert.deepEqual(checkImageFile({ recipe: "a" }, ref, good), []);
    assert.deepEqual(
      checkImageFile({ recipe: "a" }, ref, { ...good, bytes: MAX_IMAGE_BYTES }),
      [],
    );
  });

  it("檔案不存在", () => {
    const issues = checkImageFile({ recipe: "a" }, ref, null);
    assert.equal(issues[0]?.recipe, "a");
    assert.equal(issues[0]?.field, "hero");
    assert.match(issues[0]!.message, /找不到/);
  });

  it("格式不是 WebP", () => {
    const issues = checkImageFile({ recipe: "a" }, ref, {
      ...good,
      format: "png",
    });
    assert.match(issues[0]!.message, /WebP/);
  });

  it("尺寸不是 1536×1024", () => {
    const issues = checkImageFile({ recipe: "a" }, ref, {
      ...good,
      width: 1024,
    });
    assert.match(issues[0]!.message, /1536/);
  });

  it("超過 300 KB", () => {
    const issues = checkImageFile({ recipe: "a" }, ref, {
      ...good,
      bytes: MAX_IMAGE_BYTES + 1,
    });
    assert.match(issues[0]!.message, /300 KB/);
  });

  it("多項違規逐項列出", () => {
    const issues = checkImageFile({ recipe: "a" }, ref, {
      format: "png",
      width: 10,
      height: 10,
      bytes: MAX_IMAGE_BYTES + 1,
    });
    assert.equal(issues.length, 3);
  });
});

describe("collectImageRefs", () => {
  it("收集成品圖、材料合照、步驟圖與材料圖，並記下欄位路徑", () => {
    const { data } = parseRecipe("a", {
      title: "t",
      summary: "s",
      servings: 1,
      category: "非湯料理",
      vegetable: true,
      draft: false,
      timeMinutes: 5,
      ingredients: [
        {
          name: "蛋",
          amount: { value: 1, unit: "顆" },
          image: { src: "./i.webp", alt: "蛋" },
        },
      ],
      steps: [
        { text: "x" },
        { text: "y", image: { src: "./s.webp", alt: "步驟" } },
      ],
      hero: { src: "./h.webp", alt: "h" },
      ingredientsPhoto: { src: "./p.webp", alt: "p" },
    });
    const fields = collectImageRefs(data!).map((r) => r.field);
    assert.deepEqual(fields.sort(), [
      "hero",
      "ingredients.0.image",
      "ingredientsPhoto",
      "steps.1.image",
    ]);
  });
});

describe("checkHeroAlt", () => {
  it("成品圖的替代文字沒有餐具即通過", () => {
    assert.deepEqual(checkHeroAlt({ recipe: "a" }, ref), []);
  });

  it("成品圖替代文字提到筷子、湯匙或叉子時回報", () => {
    for (const alt of [
      "盤子右側放著一雙木筷",
      "碗旁一支白瓷湯匙",
      "盤邊一把叉子",
      "碗旁一支湯勺",
      "一副刀叉",
      "一支調羹",
    ]) {
      const issues = checkHeroAlt({ recipe: "a" }, { ...ref, alt });
      assert.equal(issues.length, 1, alt);
      assert.equal(issues[0]?.field, "hero");
      assert.match(issues[0]!.message, /餐具/);
    }
  });

  it("步驟圖不檢查：餐具可能是做法的一部分", () => {
    assert.deepEqual(
      checkHeroAlt(
        { recipe: "a" },
        {
          field: "steps.1.image",
          src: "./s.webp",
          alt: "盤上橫放一支筷子",
        },
      ),
      [],
    );
  });
});
