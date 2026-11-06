import { describe, expect, it } from "vitest";
import { alternatePath, htmlLang, isLocale, localePath, locales, splitLocale } from "@/lib/i18n";

describe("locales", () => {
  it("英文為預設(第一個),繁中第二", () => {
    expect(locales).toEqual(["en", "zh-tw"]);
  });

  it("isLocale 只接受支援的語系", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("zh-tw")).toBe(true);
    expect(isLocale("zh-TW")).toBe(false);
    expect(isLocale("ja")).toBe(false);
  });
});

describe("htmlLang", () => {
  it("對應 BCP 47 語言標籤", () => {
    expect(htmlLang("en")).toBe("en");
    expect(htmlLang("zh-tw")).toBe("zh-Hant-TW");
  });
});

describe("localePath", () => {
  it("英文不加前綴", () => {
    expect(localePath("en", "/")).toBe("/");
    expect(localePath("en", "/menu/")).toBe("/menu/");
  });

  it("繁中加 /zh-tw 前綴", () => {
    expect(localePath("zh-tw", "/")).toBe("/zh-tw/");
    expect(localePath("zh-tw", "/reserve/done/")).toBe("/zh-tw/reserve/done/");
  });

  it("補上結尾斜線(與 trailingSlash 一致)", () => {
    expect(localePath("en", "/menu")).toBe("/menu/");
    expect(localePath("zh-tw", "/menu")).toBe("/zh-tw/menu/");
  });
});

describe("splitLocale", () => {
  it("從網址取出語系與不含語系的路徑", () => {
    expect(splitLocale("/")).toEqual({ locale: "en", path: "/" });
    expect(splitLocale("/menu/")).toEqual({ locale: "en", path: "/menu/" });
    expect(splitLocale("/zh-tw/")).toEqual({ locale: "zh-tw", path: "/" });
    expect(splitLocale("/zh-tw")).toEqual({ locale: "zh-tw", path: "/" });
    expect(splitLocale("/zh-tw/menu/")).toEqual({ locale: "zh-tw", path: "/menu/" });
  });

  it("只有完整的 /zh-tw 區段才算語系前綴", () => {
    expect(splitLocale("/zh-twx/")).toEqual({ locale: "en", path: "/zh-twx/" });
  });
});

describe("alternatePath", () => {
  it("切換到同一頁的另一語系", () => {
    expect(alternatePath("/menu/", "zh-tw")).toBe("/zh-tw/menu/");
    expect(alternatePath("/zh-tw/menu/", "en")).toBe("/menu/");
    expect(alternatePath("/zh-tw/", "en")).toBe("/");
    expect(alternatePath("/", "zh-tw")).toBe("/zh-tw/");
  });
});
