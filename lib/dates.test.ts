import { describe, expect, it } from "vitest";
import { addDays, bookingWindow, isIsoDate, todayInTaipei } from "@/lib/dates";

describe("todayInTaipei", () => {
  it("uses Taipei time (UTC+8): after 16:00 UTC it is already the next day", () => {
    expect(todayInTaipei(new Date("2026-11-05T15:59:00Z"))).toBe("2026-11-05");
    expect(todayInTaipei(new Date("2026-11-05T16:00:00Z"))).toBe("2026-11-06");
  });
});

describe("addDays", () => {
  it("handles month and year boundaries", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-11-06", 30)).toBe("2026-12-06");
  });
});

describe("bookingWindow", () => {
  it("bookable range is today to 30 days ahead (matches create_reservation)", () => {
    expect(bookingWindow(new Date("2026-11-05T16:00:00Z"))).toEqual({ min: "2026-11-06", max: "2026-12-06" });
  });
});

describe("isIsoDate", () => {
  it("accepts real YYYY-MM-DD dates", () => {
    expect(isIsoDate("2026-11-06")).toBe(true);
    expect(isIsoDate("2028-02-29")).toBe(true);
  });

  it("rejects malformed or nonexistent dates", () => {
    for (const bad of ["2026-2-1", "2026/11/06", "2026-13-01", "2026-02-30", "2027-02-29", "", "2026-11-06T00:00"]) {
      expect(isIsoDate(bad), bad).toBe(false);
    }
  });
});
