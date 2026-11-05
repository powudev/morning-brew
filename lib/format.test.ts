import { describe, expect, it } from "vitest";
import { formatPrice, formatTimeRange, tagLabel } from "@/lib/format";

describe("formatPrice", () => {
  it("加上 NT$ 前綴", () => {
    expect(formatPrice(140)).toBe("NT$140");
  });

  it("千位加逗號", () => {
    expect(formatPrice(1200)).toBe("NT$1,200");
  });
});

describe("formatTimeRange", () => {
  it("以 en dash 連接開始與結束時間", () => {
    expect(formatTimeRange("07:30", "18:00")).toBe("07:30 – 18:00");
  });
});

describe("tagLabel", () => {
  it("回傳標籤的中文名稱", () => {
    expect(tagLabel("vegan")).toBe("全素");
    expect(tagLabel("decaf")).toBe("無/低咖啡因");
  });

  it("未知標籤回傳 undefined,不顯示原始代碼", () => {
    expect(tagLabel("unknown-tag")).toBeUndefined();
  });
});

describe("telHref", () => {
  it("只保留數字", async () => {
    const { telHref } = await import("@/lib/format");
    expect(telHref("02-0000-0000")).toBe("tel:0200000000");
  });
});
