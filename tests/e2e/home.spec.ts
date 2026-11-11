import { expect, test } from "./support/fixtures";
import menu from "../../content/menu.json";
import site from "../../content/site.json";
import { eachLocale, getDictionary, localePath } from "./support/i18n";

eachLocale((locale) => {
  const d = getDictionary(locale);
  const t = d.home;
  const url = (path: string) => localePath(locale, path);

  test.describe(`[${locale}] home layout`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(url("/"));
    });

    test("sections in order: features → featured menu → hours and location → reviews → CTA", async ({ page }) => {
      const headings = await page.getByRole("main").getByRole("heading", { level: 2 }).allTextContents();
      expect(headings).toEqual([t.featuresTitle, t.featuredTitle, t.visitTitle, t.reviewsTitle, t.ctaTitle]);
    });

    test("hero has a tagline and two call-to-action buttons", async ({ page }) => {
      const hero = page.getByRole("region", { name: site.name, exact: true });
      await expect(hero).toContainText(site.tagline[locale]);
      await expect(hero.getByRole("link", { name: t.ctaReserve })).toHaveAttribute("href", url("/reserve/"));
      await expect(hero.getByRole("link", { name: t.ctaMenu })).toHaveAttribute("href", url("/menu/"));
    });

    test("headings use Playfair Display and body text Inter (an undefined font variable must not break the whole font-family)", async ({ page }) => {
      const h1Font = await page.getByRole("heading", { level: 1 }).evaluate((el) => getComputedStyle(el).fontFamily);
      const bodyFont = await page.locator("body").evaluate((el) => getComputedStyle(el).fontFamily);
      expect(h1Font).toMatch(/Playfair/i);
      expect(bodyFont).toMatch(/Inter/i);
    });

    test("features section has 3 cards", async ({ page }) => {
      await expect(page.getByRole("region", { name: t.featuresTitle }).getByRole("listitem")).toHaveCount(3);
    });

    test("featured menu shows every featured item with price and links to the full menu", async ({ page }) => {
      const section = page.getByRole("region", { name: t.featuredTitle });
      const featured = menu.items.filter((i) => i.featured);
      await expect(section.getByRole("listitem")).toHaveCount(featured.length);
      for (const item of featured) {
        await expect(section.getByText(item.name[locale], { exact: true })).toBeVisible();
        await expect(section.getByText(`NT$${item.price}`).first()).toBeVisible();
      }
      await expect(section.getByRole("link", { name: t.fullMenu })).toHaveAttribute("href", url("/menu/"));
    });

    test("opening hours are a table, with address and phone", async ({ page }) => {
      const section = page.getByRole("region", { name: t.visitTitle });
      const table = section.getByRole("table");
      for (const h of site.hours) {
        await expect(table.getByRole("row", { name: h.label[locale] })).toContainText(`${h.open} – ${h.close}`);
      }
      await expect(section).toContainText(site.address.street[locale]);
      await expect(section.getByRole("link", { name: site.phone })).toHaveAttribute("href", "tel:0200000000");
    });

    test("map loads only after a click", async ({ page }) => {
      const section = page.getByRole("region", { name: t.visitTitle });
      await expect(section.locator("iframe")).toHaveCount(0);
      await section.getByRole("button", { name: d.map.load }).click();
      await expect(section.locator(`iframe[title="${site.map.embedTitle[locale]}"]`)).toBeVisible();
    });

    test("closing CTA links to the reservation page", async ({ page }) => {
      await expect(
        page.getByRole("region", { name: t.ctaTitle }).getByRole("link", { name: t.ctaReserve }),
      ).toHaveAttribute("href", url("/reserve/"));
    });
  });

  test.describe(`[${locale}] menu layout`, () => {
    test("category nav jumps to each category", async ({ page }) => {
      await page.goto(url("/menu/"));
      const nav = page.getByRole("navigation", { name: d.menu.categoriesLabel });
      await expect(nav.getByRole("link")).toHaveCount(menu.categories.length);
      const last = menu.categories[menu.categories.length - 1];
      await nav.getByRole("link", { name: last.name[locale] }).click();
      await expect(page).toHaveURL(new RegExp(`#${last.id}$`));
      await expect(page.getByRole("heading", { level: 2, name: new RegExp(last.name[locale]) })).toBeInViewport();
    });

    test("after scrolling, category nav sticks right below the header without being covered", async ({ page }) => {
      await page.goto(url("/menu/"));
      await page.mouse.wheel(0, 1500);
      await page.waitForTimeout(300);
      const header = await page.locator("header").boundingBox();
      const nav = await page.getByRole("navigation", { name: d.menu.categoriesLabel }).boundingBox();
      expect(header && nav).toBeTruthy();
      expect(nav!.y).toBeGreaterThanOrEqual(header!.y + header!.height - 1);
      expect(nav!.y).toBeLessThanOrEqual(header!.y + header!.height + 2);
    });

    test("items show price and localized tags, not raw codes", async ({ page }) => {
      await page.goto(url("/menu/"));
      const vegan = menu.items.find((i) => i.tags.includes("vegan"))!;
      const card = page.getByRole("listitem").filter({ hasText: vegan.name[locale] });
      await expect(card).toContainText(`NT$${vegan.price}`);
      await expect(card).toContainText(menu.tagLabels[locale].vegan);
      if (locale !== "en") await expect(card).not.toContainText("vegan");
    });
  });

  test.describe(`[${locale}] about page`, () => {
    test("has the brand story section and demo notice", async ({ page }) => {
      await page.goto(url("/about/"));
      await expect(page.getByRole("heading", { level: 2, name: d.about.storyTitle })).toBeVisible();
      await expect(page.getByRole("main")).toContainText(d.about.lead);
    });
  });
});
