import { describe, expect, it } from "vitest";
import { getDictionary, interpolate } from "@/lib/dictionary";

describe("getDictionary", () => {
  it("returns the dictionary for each locale", () => {
    expect(getDictionary("en").nav.menu).toBe("Menu");
    expect(getDictionary("zh-tw").nav.menu).toBe("菜單");
  });
});

describe("interpolate", () => {
  it("interpolates variables and leaves missing ones as is", () => {
    expect(interpolate("{time} ({n} left)", { time: "08:00", n: 3 })).toBe("08:00 (3 left)");
    expect(interpolate("Hi {name}", {})).toBe("Hi {name}");
  });
});
