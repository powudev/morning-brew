// 內容資料完整性:改 JSON 時打錯分類、漏標示範字樣,測試會擋下來
import { describe, expect, it } from "vitest";
import menu from "@/content/menu.json";
import reviews from "@/content/reviews.json";
import site from "@/content/site.json";

describe("menu.json", () => {
  const categoryIds = new Set(menu.categories.map((c) => c.id));

  it("品項數量在規格範圍內(15–20)", () => {
    expect(menu.items.length).toBeGreaterThanOrEqual(15);
    expect(menu.items.length).toBeLessThanOrEqual(20);
  });

  it("品項 id 不重複", () => {
    const ids = menu.items.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("每個品項的分類都存在,且每個分類至少有一項", () => {
    for (const item of menu.items) expect(categoryIds).toContain(item.category);
    for (const id of categoryIds) {
      expect(menu.items.some((item) => item.category === id)).toBe(true);
    }
  });

  it("標籤都有對應的中文名稱", () => {
    const labels = Object.keys(menu.tagLabels);
    for (const item of menu.items) {
      for (const tag of item.tags) expect(labels).toContain(tag);
    }
  });

  it("價格為正整數,名稱與說明不為空", () => {
    for (const item of menu.items) {
      expect(Number.isInteger(item.price) && item.price > 0).toBe(true);
      expect(item.name.trim()).not.toBe("");
      expect(item.nameEn.trim()).not.toBe("");
      expect(item.description.trim()).not.toBe("");
    }
  });
});

describe("site.json", () => {
  it("有示範專案聲明", () => {
    expect(site.demoNotice).toContain("Demo project");
    expect(site.demoNotice).toContain("虛構");
  });

  it("地址與電話明確為虛構格式", () => {
    expect(site.address.street).toContain("虛構");
    expect(site.phone).toBe("02-0000-0000");
  });

  it("營業時間為 HH:MM 且開店早於打烊", () => {
    const hhmm = /^([01]\d|2[0-3]):[0-5]\d$/;
    for (const h of site.hours) {
      expect(h.open).toMatch(hhmm);
      expect(h.close).toMatch(hhmm);
      expect(h.open < h.close).toBe(true);
    }
  });

  it("營業時間涵蓋一週七天且不重複", () => {
    const days = site.hours.flatMap((h) => h.days);
    expect(new Set(days)).toEqual(new Set(["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]));
    expect(days).toHaveLength(7);
  });
});

describe("reviews.json", () => {
  it("整體與每則評論都標示為示範內容", () => {
    expect(reviews.notice).toContain("示範");
    for (const r of reviews.items) {
      expect(r.text).toContain("示範內容");
      expect(r.author).toContain("示範");
    }
  });

  it("評分介於 1–5", () => {
    for (const r of reviews.items) {
      expect(r.rating).toBeGreaterThanOrEqual(1);
      expect(r.rating).toBeLessThanOrEqual(5);
    }
  });
});
