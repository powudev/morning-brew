import { expect, test } from "./support/fixtures";
import menu from "../../content/menu.json";
import reviews from "../../content/reviews.json";
import site from "../../content/site.json";
import { eachLocale, getDictionary, htmlLang, localePath } from "./support/i18n";

const publicPaths = ["/", "/menu/", "/about/", "/reserve/", "/privacy/"];

eachLocale((locale) => {
  const d = getDictionary(locale);
  const url = (path: string) => localePath(locale, path);

  test.describe(`[${locale}] 首頁`, () => {
    test("顯示店名、該語系 lang、示範專案聲明與訂位 CTA", async ({ page }) => {
      await page.goto(url("/"));
      await expect(page).toHaveTitle(/Morning Brew/);
      await expect(page.locator("html")).toHaveAttribute("lang", htmlLang(locale));
      await expect(page.getByRole("heading", { level: 1, name: "Morning Brew" })).toBeVisible();
      await expect(page.getByRole("note")).toContainText(site.demoNotice[locale]);
      const ctas = page.getByRole("main").getByRole("link", { name: d.home.ctaReserve });
      expect(await ctas.count()).toBeGreaterThan(0);
      for (const cta of await ctas.all()) await expect(cta).toHaveAttribute("href", url("/reserve/"));
    });

    test("評論標示為示範內容", async ({ page }) => {
      await page.goto(url("/"));
      await expect(page.getByRole("region", { name: d.home.reviewsTitle })).toContainText(reviews.notice[locale]);
    });

    test("輸出該語系的 CafeOrCoffeeShop JSON-LD", async ({ page }) => {
      await page.goto(url("/"));
      const raw = await page.locator('script[type="application/ld+json"]').textContent();
      expect(JSON.parse(raw ?? "{}")).toMatchObject({
        "@type": "CafeOrCoffeeShop",
        name: "Morning Brew",
        inLanguage: htmlLang(locale),
        description: site.description[locale],
      });
    });

    test("主選單可以前往菜單頁", async ({ page }) => {
      await page.goto(url("/"));
      await page.getByRole("navigation", { name: d.nav.label }).getByRole("link", { name: d.nav.menu }).click();
      await expect(page).toHaveURL(new RegExp(`${url("/menu/").replace(/\//g, "\\/")}$`));
      await expect(page.getByRole("heading", { level: 1, name: d.menu.title })).toBeVisible();
    });
  });

  test.describe(`[${locale}] 菜單頁`, () => {
    test("列出所有分類與品項(該語系)", async ({ page }) => {
      await page.goto(url("/menu/"));
      for (const cat of menu.categories) {
        await expect(page.getByRole("heading", { level: 2, name: new RegExp(cat.name[locale]) })).toBeVisible();
      }
      for (const item of menu.items) await expect(page.getByText(item.description[locale])).toBeVisible();
    });
  });

  test.describe(`[${locale}] SEO`, () => {
    test("各公開頁有唯一 title、canonical 與兩語系 hreflang", async ({ page }) => {
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

    test("訂位完成頁設定 noindex", async ({ page }) => {
      await page.goto(url("/reserve/done/"));
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    });

    test("語言切換器切到同一頁的另一語系", async ({ page }) => {
      await page.goto(url("/menu/"));
      await page.getByRole("link", { name: d.langSwitch.aria }).click();
      const other = locale === "en" ? "zh-tw" : "en";
      await expect(page).toHaveURL(new RegExp(`${localePath(other, "/menu/")}$`));
      await expect(page.locator("html")).toHaveAttribute("lang", htmlLang(other));
      await expect(page.getByRole("heading", { level: 1, name: getDictionary(other).menu.title })).toBeVisible();
    });
  });
});

test.describe("SEO 與路由(與語系無關)", () => {
  test("英文為預設語系:根路徑是英文", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test("後台設定 noindex,且沒有語言切換器", async ({ page }) => {
    for (const path of ["/admin/", "/admin/login/"]) {
      await page.goto(path);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
      await expect(page.getByRole("link", { name: getDictionary("en").langSwitch.aria })).toHaveCount(0);
    }
  });

  test("robots.txt 禁止 /admin/,sitemap.xml 含兩語系", async ({ request }) => {
    const robots = await request.get("/robots.txt");
    expect(await robots.text()).toContain("Disallow: /admin/");
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("/menu/</loc>");
    expect(sitemap).toContain("/zh-tw/menu/</loc>");
    expect(sitemap).toMatch(/hreflang="zh-Hant-TW"/);
  });

  test("不存在的網址回 404,顯示雙語頁面", async ({ page }) => {
    for (const path of ["/no-such-page/", "/zh-tw/no-such-page/"]) {
      const res = await page.goto(path);
      expect(res?.status()).toBe(404);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(getDictionary("en").notFound.title);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(getDictionary("zh-tw").notFound.title);
    }
  });
});
