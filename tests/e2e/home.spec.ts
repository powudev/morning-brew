import { expect, test } from "@playwright/test";
import menu from "../../content/menu.json";
import site from "../../content/site.json";

test.describe("首頁版面", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("區塊依序為 特色 → 精選菜單 → 營業時間與位置 → 評論 → CTA", async ({ page }) => {
    const headings = await page.getByRole("main").getByRole("heading", { level: 2 }).allTextContents();
    expect(headings).toEqual(["我們的特色", "精選菜單", "營業時間與位置", "顧客評論", "今天就來坐坐"]);
  });

  test("Hero 有標語與兩個行動按鈕", async ({ page }) => {
    const hero = page.getByRole("region", { name: site.name });
    await expect(hero).toContainText(site.tagline);
    await expect(hero.getByRole("link", { name: "線上訂位" })).toHaveAttribute("href", "/reserve/");
    await expect(hero.getByRole("link", { name: "看菜單" })).toHaveAttribute("href", "/menu/");
  });

  test("特色區有 3 張卡片", async ({ page }) => {
    await expect(page.getByRole("region", { name: "我們的特色" }).getByRole("listitem")).toHaveCount(3);
  });

  test("精選菜單顯示所有 featured 品項與格式化價格,並連到完整菜單", async ({ page }) => {
    const section = page.getByRole("region", { name: "精選菜單" });
    const featured = menu.items.filter((i) => i.featured);
    await expect(section.getByRole("listitem")).toHaveCount(featured.length);
    for (const item of featured) {
      await expect(section.getByText(item.name, { exact: true })).toBeVisible();
      await expect(section.getByText(`NT$${item.price}`).first()).toBeVisible();
    }
    await expect(section.getByRole("link", { name: "看完整菜單" })).toHaveAttribute("href", "/menu/");
  });

  test("營業時間以表格呈現,並顯示地址與電話", async ({ page }) => {
    const section = page.getByRole("region", { name: "營業時間與位置" });
    const table = section.getByRole("table");
    for (const h of site.hours) {
      await expect(table.getByRole("row", { name: new RegExp(h.label) })).toContainText(`${h.open} – ${h.close}`);
    }
    await expect(section).toContainText(site.address.street);
    await expect(section.getByRole("link", { name: site.phone })).toHaveAttribute("href", "tel:0200000000");
  });

  test("地圖點擊後才載入", async ({ page }) => {
    const section = page.getByRole("region", { name: "營業時間與位置" });
    await expect(section.locator("iframe")).toHaveCount(0);
    await section.getByRole("button", { name: "載入地圖" }).click();
    await expect(section.locator(`iframe[title="${site.map.embedTitle}"]`)).toBeVisible();
  });

  test("結尾 CTA 連到訂位頁", async ({ page }) => {
    await expect(
      page.getByRole("region", { name: "今天就來坐坐" }).getByRole("link", { name: "線上訂位" }),
    ).toHaveAttribute("href", "/reserve/");
  });
});

test.describe("菜單頁版面", () => {
  test("分類導覽可跳到各分類", async ({ page }) => {
    await page.goto("/menu/");
    const nav = page.getByRole("navigation", { name: "菜單分類" });
    await expect(nav.getByRole("link")).toHaveCount(menu.categories.length);
    const last = menu.categories[menu.categories.length - 1];
    await nav.getByRole("link", { name: new RegExp(last.name) }).click();
    await expect(page).toHaveURL(new RegExp(`#${last.id}$`));
    await expect(page.getByRole("heading", { level: 2, name: new RegExp(last.name) })).toBeInViewport();
  });

  test("捲動後分類導覽黏在 header 正下方,不被蓋住", async ({ page }) => {
    await page.goto("/menu/");
    await page.mouse.wheel(0, 1500);
    await page.waitForTimeout(300);
    const header = await page.locator("header").boundingBox();
    const nav = await page.getByRole("navigation", { name: "菜單分類" }).boundingBox();
    expect(header && nav).toBeTruthy();
    expect(nav!.y).toBeGreaterThanOrEqual(header!.y + header!.height - 1);
    expect(nav!.y).toBeLessThanOrEqual(header!.y + header!.height + 2);
  });

  test("品項顯示格式化價格與中文標籤", async ({ page }) => {
    await page.goto("/menu/");
    const vegan = menu.items.find((i) => i.tags.includes("vegan"))!;
    const card = page.getByRole("listitem").filter({ hasText: vegan.name });
    await expect(card).toContainText(`NT$${vegan.price}`);
    await expect(card).toContainText("全素");
    await expect(card).not.toContainText("vegan");
  });
});

test.describe("關於頁", () => {
  test("有品牌故事區塊與示範聲明", async ({ page }) => {
    await page.goto("/about/");
    await expect(page.getByRole("heading", { level: 2, name: "我們的故事" })).toBeVisible();
    await expect(page.getByRole("main")).toContainText("示範");
  });
});
