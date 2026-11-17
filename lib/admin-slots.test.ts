import { describe, expect, it } from "vitest";
import { groupSlots, mapSlotRow, validateNewSlot, weekdayNames, type AdminSlot } from "@/lib/admin-slots";

const s = (over: Partial<AdminSlot>): AdminSlot => ({
  id: 1,
  weekday: 1,
  date: null,
  startTime: "08:00",
  capacity: 10,
  active: true,
  ...over,
});

describe("mapSlotRow", () => {
  it("maps a weekly row with HH:MM time", () => {
    expect(
      mapSlotRow({ id: 5, weekday: 2, slot_date: null, start_time: "09:30:00", capacity: 12, is_active: true }),
    ).toEqual({ id: 5, weekday: 2, date: null, startTime: "09:30", capacity: 12, active: true });
  });

  it("maps a date-specific row", () => {
    expect(
      mapSlotRow({ id: 6, weekday: null, slot_date: "2099-01-02", start_time: "18:00:00", capacity: 4, is_active: false }),
    ).toEqual({ id: 6, weekday: null, date: "2099-01-02", startTime: "18:00", capacity: 4, active: false });
  });
});

describe("groupSlots", () => {
  it("groups weekly slots by weekday (Sunday = 0 first) sorted by time", () => {
    const { weekly } = groupSlots(
      [s({ id: 1, weekday: 1, startTime: "10:00" }), s({ id: 2, weekday: 0, startTime: "09:00" }), s({ id: 3, weekday: 1, startTime: "08:00" })],
      "2099-01-01",
    );
    expect(weekly.map((g) => [g.weekday, g.slots.map((x) => x.id)])).toEqual([
      [0, [2]],
      [1, [3, 1]],
    ]);
  });

  it("lists date slots from today onward, sorted by date then time; past dates are hidden", () => {
    const { dated } = groupSlots(
      [
        s({ id: 1, weekday: null, date: "2099-01-05", startTime: "10:00" }),
        s({ id: 2, weekday: null, date: "2098-12-31", startTime: "10:00" }),
        s({ id: 3, weekday: null, date: "2099-01-01", startTime: "09:00" }),
        s({ id: 4, weekday: null, date: "2099-01-05", startTime: "08:00" }),
      ],
      "2099-01-01",
    );
    expect(dated.map((x) => x.id)).toEqual([3, 4, 1]);
  });
});

describe("weekdayNames", () => {
  it("starts on Sunday to match Postgres extract(dow)", () => {
    expect(weekdayNames[0]).toBe("Sunday");
    expect(weekdayNames[6]).toBe("Saturday");
  });
});

describe("validateNewSlot", () => {
  const today = "2099-01-01";

  it("accepts a weekly slot", () => {
    expect(validateNewSlot({ kind: "weekly", weekday: "3", date: "", startTime: "08:30", capacity: "12" }, today)).toEqual({
      ok: true,
      value: { weekday: 3, date: null, startTime: "08:30", capacity: 12 },
    });
  });

  it("accepts a date slot from today on", () => {
    expect(validateNewSlot({ kind: "date", weekday: "", date: today, startTime: "18:00", capacity: "1" }, today)).toEqual({
      ok: true,
      value: { weekday: null, date: today, startTime: "18:00", capacity: 1 },
    });
  });

  it.each([
    ["capacity 0", { capacity: "0" }, "capacity"],
    ["capacity 201", { capacity: "201" }, "capacity"],
    ["fractional capacity", { capacity: "2.5" }, "capacity"],
    ["empty capacity", { capacity: "" }, "capacity"],
    ["bad time", { startTime: "25:00" }, "startTime"],
    ["empty time", { startTime: "" }, "startTime"],
    ["weekday out of range", { weekday: "7" }, "weekday"],
    ["weekday empty", { weekday: "" }, "weekday"],
  ])("rejects %s", (_label, over, field) => {
    const result = validateNewSlot({ kind: "weekly", weekday: "1", date: "", startTime: "08:00", capacity: "5", ...over }, today);
    expect(result).toEqual({ ok: false, field });
  });

  it.each([
    ["a past date", "2098-12-31"],
    ["an invalid date", "2099-02-30"],
    ["an empty date", ""],
  ])("rejects %s for a date slot", (_label, date) => {
    expect(validateNewSlot({ kind: "date", weekday: "", date, startTime: "08:00", capacity: "5" }, today)).toEqual({
      ok: false,
      field: "date",
    });
  });
});
