import { describe, expect, it } from "vitest";
import { pageMetadata } from "@/lib/seo";

describe("pageMetadata", () => {
  it("en page: canonical is the root path, hreflang covers both locales and x-default", () => {
    const meta = pageMetadata({ locale: "en", path: "/menu/", title: "Menu", description: "Our menu" });
    expect(meta.title).toBe("Menu");
    expect(meta.description).toBe("Our menu");
    expect(meta.alternates).toEqual({
      canonical: "/menu/",
      languages: { en: "/menu/", "zh-Hant-TW": "/zh-tw/menu/", "x-default": "/menu/" },
    });
    expect(meta.openGraph).toMatchObject({ locale: "en_US", url: "/menu/", title: "Menu" });
  });

  it("zh-tw page: canonical is the /zh-tw path, same hreflang", () => {
    const meta = pageMetadata({ locale: "zh-tw", path: "/", title: "首頁", description: "說明" });
    expect(meta.alternates).toEqual({
      canonical: "/zh-tw/",
      languages: { en: "/", "zh-Hant-TW": "/zh-tw/", "x-default": "/" },
    });
    expect(meta.openGraph).toMatchObject({ locale: "zh_TW", url: "/zh-tw/" });
  });

  it("sets robots on noindex pages", () => {
    const meta = pageMetadata({ locale: "en", path: "/reserve/done/", title: "Done", description: "", noindex: true });
    expect(meta.robots).toEqual({ index: false, follow: true });
  });
});
