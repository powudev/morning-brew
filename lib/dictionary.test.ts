import { describe, expect, it } from "vitest";
import { getDictionary, interpolate } from "@/lib/dictionary";

describe("getDictionary", () => {
  it("依語系回傳字典", () => {
    expect(getDictionary("en").nav.menu).toBe("Menu");
    expect(getDictionary("zh-tw").nav.menu).toBe("菜單");
  });
});

describe("interpolate", () => {
  it("替換變數,未提供的變數保留原樣", () => {
    expect(interpolate("{time} ({n} left)", { time: "08:00", n: 3 })).toBe("08:00 (3 left)");
    expect(interpolate("Hi {name}", {})).toBe("Hi {name}");
  });
});
