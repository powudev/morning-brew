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

describe("i18n dictionaries", () => {
  it("en and zh-tw have exactly the same keys", () => {
    expect(keyPaths(zhTw).sort()).toEqual(keyPaths(en).sort());
  });

  it("no string is empty", () => {
    for (const dict of [en, zhTw]) {
      for (const path of keyPaths(dict)) {
        const value = path.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], dict);
        expect(Array.isArray(value) ? value.length > 0 : filled(value), path).toBe(true);
      }
    }
  });

  it("every form error code is translated in both locales", () => {
    for (const code of errorCodes) {
      expect(filled((en.form.errors as Record<string, string>)[code]), `en ${code}`).toBe(true);
      expect(filled((zhTw.form.errors as Record<string, string>)[code]), `zh-tw ${code}`).toBe(true);
    }
  });
});

describe("menu.json", () => {
  const categoryIds = new Set(menu.categories.map((c) => c.id));

  it("has 15–20 menu items as specified", () => {
    expect(menu.items.length).toBeGreaterThanOrEqual(15);
    expect(menu.items.length).toBeLessThanOrEqual(20);
  });

  it("menu item ids are unique", () => {
    const ids = menu.items.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every item's category exists and every category has an item", () => {
    for (const item of menu.items) expect(categoryIds).toContain(item.category);
    for (const id of categoryIds) expect(menu.items.some((item) => item.category === id)).toBe(true);
  });

  it("categories, names and descriptions exist in both locales", () => {
    for (const c of menu.categories) expectLocalized(c.name, `category ${c.id}`);
    for (const item of menu.items) {
      expectLocalized(item.name, `${item.id}.name`);
      expectLocalized(item.description, `${item.id}.description`);
    }
  });

  it("tags have names in both locales", () => {
    for (const item of menu.items) {
      for (const tag of item.tags) {
        for (const l of locales) expect(filled((menu.tagLabels[l] as Record<string, string>)[tag]), `${tag} [${l}]`).toBe(true);
      }
    }
  });

  it("prices are positive integers", () => {
    for (const item of menu.items) expect(Number.isInteger(item.price) && item.price > 0).toBe(true);
  });
});

describe("site.json", () => {
  it("demo notice exists in both locales and says the business is fictional", () => {
    expect(site.demoNotice.en).toMatch(/demo project/i);
    expect(site.demoNotice.en).toMatch(/fictional/i);
    expect(site.demoNotice["zh-tw"]).toContain("Demo project");
    expect(site.demoNotice["zh-tw"]).toContain("虛構");
  });

  it("text fields exist in both locales", () => {
    for (const key of ["tagline", "intro", "description"] as const) expectLocalized(site[key], key);
    for (const key of ["street", "district", "city"] as const) expectLocalized(site.address[key], `address.${key}`);
    expectLocalized(site.map.embedTitle, "map.embedTitle");
    expectLocalized(site.map.note, "map.note");
    for (const h of site.hours) expectLocalized(h.label, "hours.label");
  });

  it("address and phone are clearly fictional", () => {
    expect(site.address.street.en).toMatch(/fictional/i);
    expect(site.address.street["zh-tw"]).toContain("虛構");
    expect(site.phone).toBe("02-0000-0000");
  });

  it("hours are HH:MM, open before close, and cover all seven days once", () => {
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
  it("the reviews section and every review are labeled as demo content in both locales", () => {
    expect(reviews.notice.en).toMatch(/demo/i);
    expect(reviews.notice["zh-tw"]).toContain("示範");
    for (const r of reviews.items) {
      expect(r.text.en).toContain("(demo content)");
      expect(r.text["zh-tw"]).toContain("(示範內容)");
      expect(r.author.en).toMatch(/demo/i);
      expect(r.author["zh-tw"]).toContain("示範");
    }
  });

  it("ratings are between 1 and 5", () => {
    for (const r of reviews.items) {
      expect(r.rating).toBeGreaterThanOrEqual(1);
      expect(r.rating).toBeLessThanOrEqual(5);
    }
  });
});
