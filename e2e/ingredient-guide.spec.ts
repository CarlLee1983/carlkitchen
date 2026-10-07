import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  expectFocusRing,
  expectNoHorizontalScroll,
  tabTo,
} from "./a11y-helpers";

test("食材介紹依類別及名稱列出已發布條目，草稿不列入筆數", async ({ page }) => {
  await page.goto("/ingredients/");
  await expect(
    page.getByRole("heading", { level: 1, name: "食材介紹" }),
  ).toBeVisible();
  await expect(page.getByText("共 4 篇食材介紹")).toBeVisible();
  const sections = page.locator("main section");
  await expect(sections.getByRole("heading", { level: 2 })).toHaveText([
    "蔬菜",
    "辛香料",
    "調味料",
  ]);
  await expect(sections.nth(0).getByRole("link")).toHaveText([
    "高麗菜",
    "番茄",
  ]);
  await expect(sections.nth(1).getByRole("link")).toHaveText(["蒜頭"]);
  await expect(sections.nth(2).getByRole("link")).toHaveText(["醬油"]);
  await expect(page.getByRole("link", { name: "草稿食材" })).toHaveCount(0);
  await page.getByRole("link", { name: "高麗菜" }).click();
  await expect(page).toHaveURL(/\/ingredients\/cabbage\/$/);
});

test("鍵盤能從主選單走到食材條目，再前往相關菜譜", async ({ page }) => {
  await page.goto("/");
  const navLink = page
    .getByRole("navigation", { name: "主選單" })
    .getByRole("link", { name: "食材介紹" });
  await tabTo(page, navLink);
  await expectFocusRing(navLink);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/ingredients\/$/);
  const entryLink = page.getByRole("link", { name: "番茄" });
  await tabTo(page, entryLink);
  await expectFocusRing(entryLink);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/ingredients\/tomato\/$/);
  const recipeLink = page.getByRole("link", { name: /番茄炒蛋/ });
  await tabTo(page, recipeLink);
  await expectFocusRing(recipeLink);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/recipes\/tomato-egg\/$/);
});

test("手機可由主選單進入食材介紹，頁面沒有水平溢出", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "選單" }).click();
  await page
    .getByRole("navigation", { name: "主選單" })
    .getByRole("link", { name: "食材介紹" })
    .click();
  await expect(page).toHaveURL(/\/ingredients\/$/);
  await expectNoHorizontalScroll(page, "/ingredients/");
  await page.getByRole("link", { name: "番茄" }).click();
  await expect(page).toHaveURL(/\/ingredients\/tomato\/$/);
});

test("有插畫的食材在總覽顯示小尺寸縮圖，無插畫條目維持文字", () => {
  const root = mkdtempSync(join(tmpdir(), "carlkitchen-ingredient-thumbs-"));
  const output = join(root, "dist");
  try {
    cpSync("tests/fixtures/ingredients/tomato", join(root, "tomato"), {
      recursive: true,
    });
    cpSync(
      "tests/fixtures/recipes/tomato-egg/hero.webp",
      join(root, "tomato/hero.webp"),
    );
    writeFileSync(
      join(root, "tomato/ingredient.yaml"),
      `${readFileSync(join(root, "tomato/ingredient.yaml"), "utf8")}\nhero:\n  src: ./hero.webp\n  alt: 番茄插畫\n`,
    );
    cpSync("tests/fixtures/ingredients/garlic", join(root, "garlic"), {
      recursive: true,
    });
    execFileSync("pnpm", ["exec", "astro", "build", "--force"], {
      env: {
        ...process.env,
        INGREDIENTS_DIR: root,
        RECIPES_DIR: "tests/fixtures/recipes",
        ASTRO_OUT_DIR: output,
      },
      stdio: "pipe",
    });
    const html = readFileSync(join(output, "ingredients/index.html"), "utf8");
    const rows = html.match(/<li(?:\s|>)[^>]*>[\s\S]*?<\/li>/g) ?? [];
    const tomatoRow = rows.find((row) =>
      row.includes('href="/ingredients/tomato/"'),
    );
    expect(tomatoRow).toBeDefined();
    expect(tomatoRow).toMatch(/<img[^>]+alt="番茄插畫"/);
    expect(tomatoRow).toMatch(/<img[^>]+srcset="[^"]+"/);
    expect(tomatoRow).toMatch(/<img[^>]+loading="lazy"/);
    const garlicRow = rows.find((row) =>
      row.includes('href="/ingredients/garlic/"'),
    );
    expect(garlicRow).toBeDefined();
    expect(garlicRow).not.toContain("<img");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("沒有已發布食材時顯示空狀態，也不產生草稿頁", () => {
  const root = mkdtempSync(join(tmpdir(), "carlkitchen-empty-ingredients-"));
  const output = join(root, "dist");
  try {
    cpSync(
      "tests/fixtures/ingredients/draft-ingredient",
      join(root, "draft-ingredient"),
      { recursive: true },
    );
    execFileSync("pnpm", ["exec", "astro", "build", "--force"], {
      env: {
        ...process.env,
        INGREDIENTS_DIR: root,
        RECIPES_DIR: "tests/fixtures/recipes",
        ASTRO_OUT_DIR: output,
      },
      stdio: "pipe",
    });
    const html = readFileSync(join(output, "ingredients/index.html"), "utf8");
    const home = readFileSync(join(output, "index.html"), "utf8");
    expect(html).toContain("目前還沒有已發布的食材介紹");
    expect(html).not.toContain("共 0 篇食材介紹");
    expect(html).not.toContain("草稿食材");
    expect(home).toContain('href="/ingredients/"');
    expect(
      existsSync(join(output, "ingredients/draft-ingredient/index.html")),
    ).toBe(false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
