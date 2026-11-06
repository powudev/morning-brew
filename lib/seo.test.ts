import { describe, expect, it } from "vitest";
import { pageMetadata } from "@/lib/seo";

describe("pageMetadata", () => {
  it("英文頁:canonical 為根路徑,hreflang 指向兩語系與 x-default", () => {
    const meta = pageMetadata({ locale: "en", path: "/menu/", title: "Menu", description: "Our menu" });
    expect(meta.title).toBe("Menu");
    expect(meta.description).toBe("Our menu");
    expect(meta.alternates).toEqual({
      canonical: "/menu/",
      languages: { en: "/menu/", "zh-Hant-TW": "/zh-tw/menu/", "x-default": "/menu/" },
    });
    expect(meta.openGraph).toMatchObject({ locale: "en_US", url: "/menu/", title: "Menu" });
  });

  it("繁中頁:canonical 為 /zh-tw 路徑,hreflang 相同", () => {
    const meta = pageMetadata({ locale: "zh-tw", path: "/", title: "首頁", description: "說明" });
    expect(meta.alternates).toEqual({
      canonical: "/zh-tw/",
      languages: { en: "/", "zh-Hant-TW": "/zh-tw/", "x-default": "/" },
    });
    expect(meta.openGraph).toMatchObject({ locale: "zh_TW", url: "/zh-tw/" });
  });

  it("noindex 頁面設定 robots", () => {
    const meta = pageMetadata({ locale: "en", path: "/reserve/done/", title: "Done", description: "", noindex: true });
    expect(meta.robots).toEqual({ index: false, follow: true });
  });
});
