import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./support/fixtures";
import { getDictionary, localePath, locales } from "./support/i18n";

const paths = ["/", "/menu/", "/about/", "/reserve/", "/reserve/done/", "/privacy/"];
const pages = [...locales.flatMap((l) => paths.map((p) => localePath(l, p))), "/no-such-page/", "/zh-tw/no-such-page/"];

for (const path of pages) {
  test.describe(`${path}`, () => {
    test("axe: no WCAG 2.1 A/AA violations", async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`)).toEqual([]);
    });

    test("no horizontal scrolling", async ({ page }) => {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });

    test("buttons and nav links have touch targets of at least 44px", async ({ page }) => {
      await page.goto(path);
      const targets = page.locator("header a, footer a, main button, main a[data-cta]");
      const count = await targets.count();
      expect(count).toBeGreaterThan(0);
      for (let i = 0; i < count; i++) {
        const box = await targets.nth(i).boundingBox();
        if (!box) continue;
        expect(box.height, await targets.nth(i).innerText()).toBeGreaterThanOrEqual(44);
      }
    });
  });
}

for (const locale of locales) {
  const d = getDictionary(locale);
  test.describe(`[${locale}] keyboard`, () => {
    test("first Tab lands on \"Skip to main content\" and Enter moves focus to main", async ({ page }) => {
      await page.goto(localePath(locale, "/menu/"));
      await page.keyboard.press("Tab");
      const skip = page.getByRole("link", { name: d.skipLink });
      await expect(skip).toBeFocused();
      await expect(skip).toBeVisible();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(/#main$/);
      await expect(page.locator("main")).toBeFocused();
    });

    test("current page is marked with aria-current in the main menu", async ({ page }) => {
      await page.goto(localePath(locale, "/menu/"));
      await expect(
        page.getByRole("navigation", { name: d.nav.label }).getByRole("link", { name: d.nav.menu }),
      ).toHaveAttribute("aria-current", "page");
    });
  });
}
