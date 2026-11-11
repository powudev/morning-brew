import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

describe("robots.txt", () => {
  const result = robots();

  it("disallows indexing the staff area", () => {
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    expect(rules.disallow).toContain("/admin/");
    expect(rules.allow).toBe("/");
  });

  it("points to the sitemap with an absolute URL", () => {
    expect(result.sitemap).toMatch(/^https?:\/\/.+\/sitemap\.xml$/);
  });
});

describe("sitemap.xml", () => {
  const entries = sitemap();
  const paths = entries.map((entry) => new URL(entry.url).pathname);
  const publicPaths = ["/", "/menu/", "/about/", "/reserve/", "/privacy/"];

  it("includes every public page in both locales", () => {
    expect(paths).toEqual(expect.arrayContaining(publicPaths));
    expect(paths).toEqual(expect.arrayContaining(publicPaths.map((p) => (p === "/" ? "/zh-tw/" : `/zh-tw${p}`))));
    expect(entries).toHaveLength(publicPaths.length * 2);
  });

  it("lists both locale URLs (hreflang) for every entry", () => {
    const menu = entries.find((e) => new URL(e.url).pathname === "/zh-tw/menu/")!;
    const languages = menu.alternates?.languages as Record<string, string>;
    expect(new URL(languages.en).pathname).toBe("/menu/");
    expect(new URL(languages["zh-Hant-TW"]).pathname).toBe("/zh-tw/menu/");
  });

  it("excludes the staff area and the booking confirmation page", () => {
    expect(paths.some((u) => u.startsWith("/admin"))).toBe(false);
    expect(paths.some((u) => u.includes("/reserve/done/"))).toBe(false);
  });
});
