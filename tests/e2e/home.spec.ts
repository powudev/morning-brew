import { expect, test } from "@playwright/test";
import menu from "../../content/menu.json";
import site from "../../content/site.json";
import { eachLocale, getDictionary, localePath } from "./support/i18n";

eachLocale((locale) => {
  const d = getDictionary(locale);
  const t = d.home;
  const url = (path: string) => localePath(locale, path);

  test.describe(`[${locale}] 首頁版面`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(url("/"));
    });

    test("區塊依序為 特色 → 精選菜單 → 營業時間與位置 → 評論 → CTA", async ({ page }) => {
      const headings = await page.getByRole("main").getByRole("heading", { level: 2 }).allTextContents();
      expect(headings).toEqual([t.featuresTitle, t.featuredTitle, t.visitTitle, t.reviewsTitle, t.ctaTitle]);
    });

    test("Hero 有標語與兩個行動按鈕", async ({ page }) => {
      const hero = page.getByRole("region", { name: site.name, exact: true });
      await expect(hero).toContainText(site.tagline[locale]);
      await expect(hero.getByRole("link", { name: t.ctaReserve })).toHaveAttribute("href", url("/reserve/"));
      await expect(hero.getByRole("link", { name: t.ctaMenu })).toHaveAttribute("href", url("/menu/"));
    });

    test("標題用 Playfair Display、內文用 Inter(字型變數未定義時不能讓整條 font-family 失效)", async ({ page }) => {
      const h1Font = await page.getByRole("heading", { level: 1 }).evaluate((el) => getComputedStyle(el).fontFamily);
      const bodyFont = await page.locator("body").evaluate((el) => getComputedStyle(el).fontFamily);
      expect(h1Font).toMatch(/Playfair/i);
      expect(bodyFont).toMatch(/Inter/i);
    });

    test("特色區有 3 張卡片", async ({ page }) => {
      await expect(page.getByRole("region", { name: t.featuresTitle }).getByRole("listitem")).toHaveCount(3);
    });

    test("精選菜單顯示所有 featured 品項與價格,並連到完整菜單", async ({ page }) => {
      const section = page.getByRole("region", { name: t.featuredTitle });
      const featured = menu.items.filter((i) => i.featured);
      await expect(section.getByRole("listitem")).toHaveCount(featured.length);
      for (const item of featured) {
        await expect(section.getByText(item.name[locale], { exact: true })).toBeVisible();
        await expect(section.getByText(`NT$${item.price}`).first()).toBeVisible();
      }
      await expect(section.getByRole("link", { name: t.fullMenu })).toHaveAttribute("href", url("/menu/"));
    });

    test("營業時間以表格呈現,並顯示地址與電話", async ({ page }) => {
      const section = page.getByRole("region", { name: t.visitTitle });
      const table = section.getByRole("table");
      for (const h of site.hours) {
        await expect(table.getByRole("row", { name: h.label[locale] })).toContainText(`${h.open} – ${h.close}`);
      }
      await expect(section).toContainText(site.address.street[locale]);
      await expect(section.getByRole("link", { name: site.phone })).toHaveAttribute("href", "tel:0200000000");
    });

    test("地圖點擊後才載入", async ({ page }) => {
      const section = page.getByRole("region", { name: t.visitTitle });
      await expect(section.locator("iframe")).toHaveCount(0);
      await section.getByRole("button", { name: d.map.load }).click();
      await expect(section.locator(`iframe[title="${site.map.embedTitle[locale]}"]`)).toBeVisible();
    });

    test("結尾 CTA 連到訂位頁", async ({ page }) => {
      await expect(
        page.getByRole("region", { name: t.ctaTitle }).getByRole("link", { name: t.ctaReserve }),
      ).toHaveAttribute("href", url("/reserve/"));
    });
  });

  test.describe(`[${locale}] 菜單頁版面`, () => {
    test("分類導覽可跳到各分類", async ({ page }) => {
      await page.goto(url("/menu/"));
      const nav = page.getByRole("navigation", { name: d.menu.categoriesLabel });
      await expect(nav.getByRole("link")).toHaveCount(menu.categories.length);
      const last = menu.categories[menu.categories.length - 1];
      await nav.getByRole("link", { name: last.name[locale] }).click();
      await expect(page).toHaveURL(new RegExp(`#${last.id}$`));
      await expect(page.getByRole("heading", { level: 2, name: new RegExp(last.name[locale]) })).toBeInViewport();
    });

    test("捲動後分類導覽黏在 header 正下方,不被蓋住", async ({ page }) => {
      await page.goto(url("/menu/"));
      await page.mouse.wheel(0, 1500);
      await page.waitForTimeout(300);
      const header = await page.locator("header").boundingBox();
      const nav = await page.getByRole("navigation", { name: d.menu.categoriesLabel }).boundingBox();
      expect(header && nav).toBeTruthy();
      expect(nav!.y).toBeGreaterThanOrEqual(header!.y + header!.height - 1);
      expect(nav!.y).toBeLessThanOrEqual(header!.y + header!.height + 2);
    });

    test("品項顯示價格與該語系標籤,不顯示原始代碼", async ({ page }) => {
      await page.goto(url("/menu/"));
      const vegan = menu.items.find((i) => i.tags.includes("vegan"))!;
      const card = page.getByRole("listitem").filter({ hasText: vegan.name[locale] });
      await expect(card).toContainText(`NT$${vegan.price}`);
      await expect(card).toContainText(menu.tagLabels[locale].vegan);
      if (locale !== "en") await expect(card).not.toContainText("vegan");
    });
  });

  test.describe(`[${locale}] 關於頁`, () => {
    test("有品牌故事區塊與示範聲明", async ({ page }) => {
      await page.goto(url("/about/"));
      await expect(page.getByRole("heading", { level: 2, name: d.about.storyTitle })).toBeVisible();
      await expect(page.getByRole("main")).toContainText(d.about.lead);
    });
  });
});
