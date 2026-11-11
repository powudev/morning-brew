import { afterEach, describe, expect, it, vi } from "vitest";
import menu from "@/content/menu.json";
import { featuredItems, itemsByCategory } from "@/lib/content";

describe("featuredItems", () => {
  it("returns only featured items", () => {
    const items = featuredItems();
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item) => item.featured)).toBe(true);
    expect(items).toHaveLength(menu.items.filter((item) => item.featured).length);
  });
});

describe("itemsByCategory", () => {
  it("returns only items in the category", () => {
    const items = itemsByCategory("pastry");
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item) => item.category === "pastry")).toBe(true);
  });

  it("returns an empty array for unknown categories", () => {
    expect(itemsByCategory("nope")).toEqual([]);
  });
});

describe("siteUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("reads NEXT_PUBLIC_SITE_URL and strips the trailing slash", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://brew.example.com/");
    vi.resetModules();
    const { siteUrl } = await import("@/lib/content");
    expect(siteUrl).toBe("https://brew.example.com");
  });

  it("falls back to localhost when unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", undefined);
    vi.resetModules();
    const { siteUrl } = await import("@/lib/content");
    expect(siteUrl).toBe("http://localhost:3000");
  });
});
