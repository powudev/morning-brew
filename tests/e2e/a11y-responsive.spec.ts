import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { getDictionary, localePath, locales } from "./support/i18n";

const paths = ["/", "/menu/", "/about/", "/reserve/", "/reserve/done/", "/privacy/"];
const pages = [...locales.flatMap((l) => paths.map((p) => localePath(l, p))), "/no-such-page/", "/zh-tw/no-such-page/"];

for (const path of pages) {
  test.describe(`${path}`, () => {
    test("axe:沒有 WCAG 2.1 A/AA 違規", async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`)).toEqual([]);
    });

    test("沒有橫向捲動", async ({ page }) => {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });

    test("按鈕與導覽連結的觸控目標至少 44px", async ({ page }) => {
      await page.goto(path);
      const targets = page.locator("header a, footer a, main button, main a[data-cta]");
      const count = await targets.count();
      expect(count).toBeGreaterThan(0);
      for (let i = 0; i < count; i++) {
        const box = await targets.nth(i).boundingBox();
        if (!box) continue; // 不可見的元素
        expect(box.height, await targets.nth(i).innerText()).toBeGreaterThanOrEqual(44);
      }
    });
  });
}

for (const locale of locales) {
  const d = getDictionary(locale);
  test.describe(`[${locale}] 鍵盤操作`, () => {
    test("第一個 Tab 停在「跳到主要內容」,按下後焦點移到 main", async ({ page }) => {
      await page.goto(localePath(locale, "/menu/"));
      await page.keyboard.press("Tab");
      const skip = page.getByRole("link", { name: d.skipLink });
      await expect(skip).toBeFocused();
      await expect(skip).toBeVisible();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(/#main$/);
      await expect(page.locator("main")).toBeFocused();
    });

    test("目前頁面在主選單標示 aria-current", async ({ page }) => {
      await page.goto(localePath(locale, "/menu/"));
      await expect(
        page.getByRole("navigation", { name: d.nav.label }).getByRole("link", { name: d.nav.menu }),
      ).toHaveAttribute("aria-current", "page");
    });
  });
}
