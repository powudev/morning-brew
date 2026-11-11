import { describe, expect, it } from "vitest";
import { formatPrice, formatTimeRange, tagLabel } from "@/lib/format";

describe("formatPrice", () => {
  it("adds the NT$ prefix", () => {
    expect(formatPrice(140)).toBe("NT$140");
  });

  it("adds thousands separators", () => {
    expect(formatPrice(1200)).toBe("NT$1,200");
  });
});

describe("formatTimeRange", () => {
  it("joins start and end times with an en dash", () => {
    expect(formatTimeRange("07:30", "18:00")).toBe("07:30 – 18:00");
  });
});

describe("tagLabel", () => {
  it("returns tag labels per locale", () => {
    expect(tagLabel("vegan", "zh-tw")).toBe("全素");
    expect(tagLabel("decaf", "zh-tw")).toBe("無/低咖啡因");
    expect(tagLabel("vegan", "en")).toBe("Vegan");
  });

  it("returns undefined for unknown tags instead of the raw code", () => {
    expect(tagLabel("unknown-tag", "en")).toBeUndefined();
  });
});

describe("formatAddress", () => {
  it("orders English from small to large and Chinese from large to small", async () => {
    const { formatAddress } = await import("@/lib/format");
    expect(formatAddress("en")).toBe("1 Demo Road (fictional address), Demo District, Taipei");
    expect(formatAddress("zh-tw")).toBe("台北市示範區示範路 1 號(虛構地址)");
  });
});

describe("telHref", () => {
  it("keeps digits only", async () => {
    const { telHref } = await import("@/lib/format");
    expect(telHref("02-0000-0000")).toBe("tel:0200000000");
  });
});
