import { expect, test } from "@playwright/test";
import menu from "../../content/menu.json";

test.describe("首頁", () => {
  test("顯示店名、示範專案聲明與訂位 CTA", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Morning Brew/);
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hant-TW");
    await expect(page.getByRole("heading", { level: 1, name: "Morning Brew" })).toBeVisible();
    await expect(page.getByRole("note")).toContainText("Demo project");
    await expect(page.getByRole("main").getByRole("link", { name: "線上訂位" })).toHaveAttribute(
      "href",
      "/reserve/",
    );
  });

  test("評論標示為示範內容", async ({ page }) => {
    await page.goto("/");
    const reviews = page.getByRole("region", { name: "顧客評論" });
    await expect(reviews).toContainText("非真實顧客評論");
  });

  test("輸出 CafeOrCoffeeShop JSON-LD", async ({ page }) => {
    await page.goto("/");
    const raw = await page.locator('script[type="application/ld+json"]').textContent();
    expect(JSON.parse(raw ?? "{}")).toMatchObject({ "@type": "CafeOrCoffeeShop", name: "Morning Brew" });
  });

  test("主選單可以前往菜單頁", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("navigation", { name: "主選單" }).getByRole("link", { name: "菜單" }).click();
    await expect(page).toHaveURL(/\/menu\/$/);
    await expect(page.getByRole("heading", { level: 1, name: "菜單" })).toBeVisible();
  });
});

test.describe("菜單頁", () => {
  test("列出所有分類與品項", async ({ page }) => {
    await page.goto("/menu/");
    for (const cat of menu.categories) {
      await expect(page.getByRole("heading", { level: 2, name: new RegExp(cat.name) })).toBeVisible();
    }
    for (const item of menu.items) {
      await expect(page.getByText(item.description)).toBeVisible();
    }
  });
});

test.describe("SEO 與路由", () => {
  test("各公開頁有唯一 title", async ({ page }) => {
    const titles = new Set<string>();
    for (const path of ["/", "/menu/", "/about/", "/reserve/", "/privacy/"]) {
      await page.goto(path);
      titles.add(await page.title());
    }
    expect(titles.size).toBe(5);
  });

  test("後台與訂位完成頁設定 noindex", async ({ page }) => {
    for (const path of ["/admin/", "/admin/login/", "/reserve/done/"]) {
      await page.goto(path);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    }
  });

  test("robots.txt 禁止 /admin/,sitemap.xml 可取得", async ({ request }) => {
    const robots = await request.get("/robots.txt");
    expect(robots.ok()).toBe(true);
    expect(await robots.text()).toContain("Disallow: /admin/");
    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.ok()).toBe(true);
    expect(await sitemap.text()).toContain("/menu/");
  });

  test("不存在的網址回 404 並顯示自訂頁面", async ({ page }) => {
    const res = await page.goto("/no-such-page/");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "找不到這個頁面" })).toBeVisible();
  });
});
