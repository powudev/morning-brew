import { afterEach, describe, expect, it, vi } from "vitest";
import menu from "@/content/menu.json";
import { featuredItems, itemsByCategory } from "@/lib/content";

describe("featuredItems", () => {
  it("只回傳標記為 featured 的品項", () => {
    const items = featuredItems();
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item) => item.featured)).toBe(true);
    expect(items).toHaveLength(menu.items.filter((item) => item.featured).length);
  });
});

describe("itemsByCategory", () => {
  it("只回傳該分類的品項", () => {
    const items = itemsByCategory("pastry");
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item) => item.category === "pastry")).toBe(true);
  });

  it("不存在的分類回傳空陣列", () => {
    expect(itemsByCategory("nope")).toEqual([]);
  });
});

describe("siteUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("讀取 NEXT_PUBLIC_SITE_URL 並移除結尾斜線", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://brew.example.com/");
    vi.resetModules();
    const { siteUrl } = await import("@/lib/content");
    expect(siteUrl).toBe("https://brew.example.com");
  });

  it("未設定時退回 localhost", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", undefined);
    vi.resetModules();
    const { siteUrl } = await import("@/lib/content");
    expect(siteUrl).toBe("http://localhost:3000");
  });
});
