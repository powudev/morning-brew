import { describe, expect, it } from "vitest";
import { alternatePath, htmlLang, isLocale, localePath, locales, splitLocale } from "@/lib/i18n";

describe("locales", () => {
  it("English is the default (first), Traditional Chinese second", () => {
    expect(locales).toEqual(["en", "zh-tw"]);
  });

  it("isLocale accepts only supported locales", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("zh-tw")).toBe(true);
    expect(isLocale("zh-TW")).toBe(false);
    expect(isLocale("ja")).toBe(false);
  });
});

describe("htmlLang", () => {
  it("maps to BCP 47 language tags", () => {
    expect(htmlLang("en")).toBe("en");
    expect(htmlLang("zh-tw")).toBe("zh-Hant-TW");
  });
});

describe("localePath", () => {
  it("English has no prefix", () => {
    expect(localePath("en", "/")).toBe("/");
    expect(localePath("en", "/menu/")).toBe("/menu/");
  });

  it("Traditional Chinese gets the /zh-tw prefix", () => {
    expect(localePath("zh-tw", "/")).toBe("/zh-tw/");
    expect(localePath("zh-tw", "/reserve/done/")).toBe("/zh-tw/reserve/done/");
  });

  it("adds a trailing slash (matches trailingSlash)", () => {
    expect(localePath("en", "/menu")).toBe("/menu/");
    expect(localePath("zh-tw", "/menu")).toBe("/zh-tw/menu/");
  });
});

describe("splitLocale", () => {
  it("splits a URL into locale and locale-free path", () => {
    expect(splitLocale("/")).toEqual({ locale: "en", path: "/" });
    expect(splitLocale("/menu/")).toEqual({ locale: "en", path: "/menu/" });
    expect(splitLocale("/zh-tw/")).toEqual({ locale: "zh-tw", path: "/" });
    expect(splitLocale("/zh-tw")).toEqual({ locale: "zh-tw", path: "/" });
    expect(splitLocale("/zh-tw/menu/")).toEqual({ locale: "zh-tw", path: "/menu/" });
  });

  it("only a full /zh-tw segment counts as a locale prefix", () => {
    expect(splitLocale("/zh-twx/")).toEqual({ locale: "en", path: "/zh-twx/" });
  });
});

describe("alternatePath", () => {
  it("switches to the same page in the other locale", () => {
    expect(alternatePath("/menu/", "zh-tw")).toBe("/zh-tw/menu/");
    expect(alternatePath("/zh-tw/menu/", "en")).toBe("/menu/");
    expect(alternatePath("/zh-tw/", "en")).toBe("/");
    expect(alternatePath("/", "zh-tw")).toBe("/zh-tw/");
  });
});
