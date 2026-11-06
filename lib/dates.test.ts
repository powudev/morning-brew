import { describe, expect, it } from "vitest";
import { addDays, bookingWindow, isIsoDate, todayInTaipei } from "@/lib/dates";

describe("todayInTaipei", () => {
  it("以台北時區(UTC+8)計算日期,UTC 16:00 後已是隔天", () => {
    expect(todayInTaipei(new Date("2026-11-05T15:59:00Z"))).toBe("2026-11-05");
    expect(todayInTaipei(new Date("2026-11-05T16:00:00Z"))).toBe("2026-11-06");
  });
});

describe("addDays", () => {
  it("跨月、跨年都正確", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-11-06", 30)).toBe("2026-12-06");
  });
});

describe("bookingWindow", () => {
  it("可訂範圍為今天到 30 天後(與 create_reservation 一致)", () => {
    expect(bookingWindow(new Date("2026-11-05T16:00:00Z"))).toEqual({ min: "2026-11-06", max: "2026-12-06" });
  });
});

describe("isIsoDate", () => {
  it("接受存在的 YYYY-MM-DD", () => {
    expect(isIsoDate("2026-11-06")).toBe(true);
    expect(isIsoDate("2028-02-29")).toBe(true);
  });

  it("拒絕格式錯誤或不存在的日期", () => {
    for (const bad of ["2026-2-1", "2026/11/06", "2026-13-01", "2026-02-30", "2027-02-29", "", "2026-11-06T00:00"]) {
      expect(isIsoDate(bad), bad).toBe(false);
    }
  });
});
