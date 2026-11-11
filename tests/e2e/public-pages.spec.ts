import { expect, test } from "./support/fixtures";
import menu from "../../content/menu.json";
import reviews from "../../content/reviews.json";
import site from "../../content/site.json";
import { eachLocale, getDictionary, htmlLang, localePath } from "./support/i18n";

const publicPaths = ["/", "/menu/", "/about/", "/reserve/", "/privacy/"];

eachLocale((locale) => {
  const d = getDictionary(locale);
  const url = (path: string) => localePath(locale, path);

  test.describe(`[${locale}] home page`, () => {
    test("shows the shop name, localized lang, demo notice and booking CTA", async ({ page }) => {
      await page.goto(url("/"));
      await expect(page).toHaveTitle(/Morning Brew/);
      await expect(page.locator("html")).toHaveAttribute("lang", htmlLang(locale));
      await expect(page.getByRole("heading", { level: 1, name: "Morning Brew" })).toBeVisible();
      await expect(page.getByRole("note")).toContainText(site.demoNotice[locale]);
      const ctas = page.getByRole("main").getByRole("link", { name: d.home.ctaReserve });
      expect(await ctas.count()).toBeGreaterThan(0);
      for (const cta of await ctas.all()) await expect(cta).toHaveAttribute("href", url("/reserve/"));
    });

    test("reviews are labelled as demo content", async ({ page }) => {
      await page.goto(url("/"));
      await expect(page.getByRole("region", { name: d.home.reviewsTitle })).toContainText(reviews.notice[locale]);
    });

    test("outputs localized CafeOrCoffeeShop JSON-LD", async ({ page }) => {
      await page.goto(url("/"));
      const raw = await page.locator('script[type="application/ld+json"]').textContent();
      expect(JSON.parse(raw ?? "{}")).toMatchObject({
        "@type": "CafeOrCoffeeShop",
        name: "Morning Brew",
        inLanguage: htmlLang(locale),
        description: site.description[locale],
      });
    });

    test("main menu navigates to the menu page", async ({ page }) => {
      await page.goto(url("/"));
      await page.getByRole("navigation", { name: d.nav.label }).getByRole("link", { name: d.nav.menu }).click();
      await expect(page).toHaveURL(new RegExp(`${url("/menu/").replace(/\//g, "\\/")}$`));
      await expect(page.getByRole("heading", { level: 1, name: d.menu.title })).toBeVisible();
    });
  });

  test.describe(`[${locale}] menu page`, () => {
    test("lists every category and item (localized)", async ({ page }) => {
      await page.goto(url("/menu/"));
      for (const cat of menu.categories) {
        await expect(page.getByRole("heading", { level: 2, name: new RegExp(cat.name[locale]) })).toBeVisible();
      }
      for (const item of menu.items) await expect(page.getByText(item.description[locale])).toBeVisible();
    });
  });

  test.describe(`[${locale}] SEO`, () => {
    test("each public page has a unique title, canonical and hreflang for both languages", async ({ page }) => {
      const titles = new Set<string>();
      for (const path of publicPaths) {
        await page.goto(url(path));
        titles.add(await page.title());
        await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`${url(path)}$`));
        await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute(
          "href",
          new RegExp(`${localePath("en", path)}$`),
        );
        await expect(page.locator('link[rel="alternate"][hreflang="zh-Hant-TW"]')).toHaveAttribute(
          "href",
          new RegExp(`${localePath("zh-tw", path)}$`),
        );
        await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute(
          "href",
          new RegExp(`${localePath("en", path)}$`),
        );
      }
      expect(titles.size).toBe(publicPaths.length);
    });

    test("booking confirmation page is noindex", async ({ page }) => {
      await page.goto(url("/reserve/done/"));
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    });

    test("language switcher goes to the same page in the other language", async ({ page }) => {
      await page.goto(url("/menu/"));
      await page.getByRole("link", { name: d.langSwitch.aria }).click();
      const other = locale === "en" ? "zh-tw" : "en";
      await expect(page).toHaveURL(new RegExp(`${localePath(other, "/menu/")}$`));
      await expect(page.locator("html")).toHaveAttribute("lang", htmlLang(other));
      await expect(page.getByRole("heading", { level: 1, name: getDictionary(other).menu.title })).toBeVisible();
    });
  });
});

test.describe("SEO and routing (locale-independent)", () => {
  test("English is the default: the root path is English", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test("staff area is noindex and has no language switcher", async ({ page }) => {
    for (const path of ["/admin/", "/admin/login/"]) {
      await page.goto(path);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
      await expect(page.getByRole("link", { name: getDictionary("en").langSwitch.aria })).toHaveCount(0);
    }
  });

  test("robots.txt disallows /admin/ and sitemap.xml lists both languages", async ({ request }) => {
    const robots = await request.get("/robots.txt");
    expect(await robots.text()).toContain("Disallow: /admin/");
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("/menu/</loc>");
    expect(sitemap).toContain("/zh-tw/menu/</loc>");
    expect(sitemap).toMatch(/hreflang="zh-Hant-TW"/);
  });

  test("unknown URLs return 404 with a bilingual page", async ({ page }) => {
    for (const path of ["/no-such-page/", "/zh-tw/no-such-page/"]) {
      const res = await page.goto(path);
      expect(res?.status()).toBe(404);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(getDictionary("en").notFound.title);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(getDictionary("zh-tw").notFound.title);
    }
  });
});
