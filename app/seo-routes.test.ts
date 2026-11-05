import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

describe("robots.txt", () => {
  const result = robots();

  it("禁止索引後台", () => {
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    expect(rules.disallow).toContain("/admin/");
    expect(rules.allow).toBe("/");
  });

  it("指向絕對網址的 sitemap", () => {
    expect(result.sitemap).toMatch(/^https?:\/\/.+\/sitemap\.xml$/);
  });
});

describe("sitemap.xml", () => {
  const urls = sitemap().map((entry) => new URL(entry.url).pathname);

  it("包含所有公開頁面", () => {
    expect(urls).toEqual(
      expect.arrayContaining(["/", "/menu/", "/about/", "/reserve/", "/privacy/"]),
    );
  });

  it("不包含後台與訂位完成頁", () => {
    expect(urls.some((u) => u.startsWith("/admin"))).toBe(false);
    expect(urls).not.toContain("/reserve/done/");
  });
});
