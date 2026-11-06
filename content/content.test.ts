// 內容資料完整性:兩語系都要有、示範標示不能漏、字典 key 兩語系一致
import { describe, expect, it } from "vitest";
import en from "@/content/i18n/en.json";
import zhTw from "@/content/i18n/zh-tw.json";
import menu from "@/content/menu.json";
import reviews from "@/content/reviews.json";
import site from "@/content/site.json";
import { locales } from "@/lib/i18n";
import { errorCodes } from "@/lib/reservation-schema";

const filled = (v: unknown) => typeof v === "string" && v.trim() !== "";
const expectLocalized = (value: Record<string, unknown>, label: string) => {
  for (const l of locales) expect(filled(value[l]), `${label} [${l}]`).toBe(true);
};

function keyPaths(obj: unknown, prefix = ""): string[] {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) return [prefix];
  return Object.entries(obj).flatMap(([k, v]) => keyPaths(v, prefix ? `${prefix}.${k}` : k));
}

describe("i18n 字典", () => {
  it("en 與 zh-tw 的 key 完全一致", () => {
    expect(keyPaths(zhTw).sort()).toEqual(keyPaths(en).sort());
  });

  it("所有字串都不是空的", () => {
    for (const dict of [en, zhTw]) {
      for (const path of keyPaths(dict)) {
        const value = path.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], dict);
        expect(Array.isArray(value) ? value.length > 0 : filled(value), path).toBe(true);
      }
    }
  });

  it("每個表單錯誤代碼都有兩語系翻譯", () => {
    for (const code of errorCodes) {
      expect(filled((en.form.errors as Record<string, string>)[code]), `en ${code}`).toBe(true);
      expect(filled((zhTw.form.errors as Record<string, string>)[code]), `zh-tw ${code}`).toBe(true);
    }
  });
});

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
    for (const id of categoryIds) expect(menu.items.some((item) => item.category === id)).toBe(true);
  });

  it("分類、品項名稱與說明兩語系都有", () => {
    for (const c of menu.categories) expectLocalized(c.name, `category ${c.id}`);
    for (const item of menu.items) {
      expectLocalized(item.name, `${item.id}.name`);
      expectLocalized(item.description, `${item.id}.description`);
    }
  });

  it("標籤在兩語系都有名稱", () => {
    for (const item of menu.items) {
      for (const tag of item.tags) {
        for (const l of locales) expect(filled((menu.tagLabels[l] as Record<string, string>)[tag]), `${tag} [${l}]`).toBe(true);
      }
    }
  });

  it("價格為正整數", () => {
    for (const item of menu.items) expect(Number.isInteger(item.price) && item.price > 0).toBe(true);
  });
});

describe("site.json", () => {
  it("示範專案聲明兩語系都有,且明確標示虛構", () => {
    expect(site.demoNotice.en).toMatch(/demo project/i);
    expect(site.demoNotice.en).toMatch(/fictional/i);
    expect(site.demoNotice["zh-tw"]).toContain("Demo project");
    expect(site.demoNotice["zh-tw"]).toContain("虛構");
  });

  it("文字欄位兩語系都有", () => {
    for (const key of ["tagline", "intro", "description"] as const) expectLocalized(site[key], key);
    for (const key of ["street", "district", "city"] as const) expectLocalized(site.address[key], `address.${key}`);
    expectLocalized(site.map.embedTitle, "map.embedTitle");
    expectLocalized(site.map.note, "map.note");
    for (const h of site.hours) expectLocalized(h.label, "hours.label");
  });

  it("地址與電話明確為虛構格式", () => {
    expect(site.address.street.en).toMatch(/fictional/i);
    expect(site.address.street["zh-tw"]).toContain("虛構");
    expect(site.phone).toBe("02-0000-0000");
  });

  it("營業時間為 HH:MM、開店早於打烊,且涵蓋一週七天不重複", () => {
    const hhmm = /^([01]\d|2[0-3]):[0-5]\d$/;
    for (const h of site.hours) {
      expect(h.open).toMatch(hhmm);
      expect(h.close).toMatch(hhmm);
      expect(h.open < h.close).toBe(true);
    }
    const days = site.hours.flatMap((h) => h.days);
    expect(new Set(days)).toEqual(new Set(["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]));
    expect(days).toHaveLength(7);
  });
});

describe("reviews.json", () => {
  it("整體與每則評論兩語系都標示為示範內容", () => {
    expect(reviews.notice.en).toMatch(/demo/i);
    expect(reviews.notice["zh-tw"]).toContain("示範");
    for (const r of reviews.items) {
      expect(r.text.en).toContain("(demo content)");
      expect(r.text["zh-tw"]).toContain("(示範內容)");
      expect(r.author.en).toMatch(/demo/i);
      expect(r.author["zh-tw"]).toContain("示範");
    }
  });

  it("評分介於 1–5", () => {
    for (const r of reviews.items) {
      expect(r.rating).toBeGreaterThanOrEqual(1);
      expect(r.rating).toBeLessThanOrEqual(5);
    }
  });
});
