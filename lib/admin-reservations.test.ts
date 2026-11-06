import { describe, expect, it } from "vitest";
import { mapReservationRow, sortReservations, summarize, type AdminReservation } from "@/lib/admin-reservations";

const row = {
  id: "r1",
  reservation_date: "2099-03-03",
  name: "Demo",
  email: "demo@example.com",
  phone: null,
  party_size: 2,
  note: null,
  status: "pending",
  created_at: "2099-03-01T00:00:00+00:00",
  time_slots: { start_time: "10:00:00" },
};

const r = (over: Partial<AdminReservation>): AdminReservation => ({
  id: "x",
  date: "2099-03-03",
  startTime: "10:00",
  name: "n",
  email: "e@example.com",
  phone: null,
  partySize: 1,
  note: null,
  status: "pending",
  createdAt: "2099-03-01T00:00:00Z",
  ...over,
});

describe("mapReservationRow", () => {
  it("把資料庫欄位轉成前端格式,時間取 HH:MM", () => {
    expect(mapReservationRow(row)).toEqual({
      id: "r1",
      date: "2099-03-03",
      startTime: "10:00",
      name: "Demo",
      email: "demo@example.com",
      phone: null,
      partySize: 2,
      note: null,
      status: "pending",
      createdAt: "2099-03-01T00:00:00+00:00",
    });
  });

  it("time_slots 為陣列(PostgREST 一對一關聯的另一種形狀)時也能取到時間", () => {
    expect(mapReservationRow({ ...row, time_slots: [{ start_time: "08:30:00" }] }).startTime).toBe("08:30");
  });

  it("未知狀態視為錯誤,不默默顯示", () => {
    expect(() => mapReservationRow({ ...row, status: "hacked" })).toThrow();
  });
});

describe("sortReservations", () => {
  it("依時段排序,同時段依建立時間", () => {
    const list = [
      r({ id: "c", startTime: "10:00", createdAt: "2099-03-01T02:00:00Z" }),
      r({ id: "a", startTime: "08:00", createdAt: "2099-03-01T03:00:00Z" }),
      r({ id: "b", startTime: "10:00", createdAt: "2099-03-01T01:00:00Z" }),
    ];
    expect(sortReservations(list).map((x) => x.id)).toEqual(["a", "b", "c"]);
  });

  it("不改動原陣列", () => {
    const list = [r({ id: "b", startTime: "10:00" }), r({ id: "a", startTime: "08:00" })];
    sortReservations(list);
    expect(list.map((x) => x.id)).toEqual(["b", "a"]);
  });
});

describe("summarize", () => {
  it("計算各狀態筆數,人數不含已取消", () => {
    const list = [
      r({ status: "pending", partySize: 2 }),
      r({ status: "confirmed", partySize: 4 }),
      r({ status: "cancelled", partySize: 3 }),
    ];
    expect(summarize(list)).toEqual({
      total: 3,
      guests: 6,
      byStatus: { pending: 1, confirmed: 1, cancelled: 1 },
    });
  });

  it("空清單", () => {
    expect(summarize([])).toEqual({ total: 0, guests: 0, byStatus: { pending: 0, confirmed: 0, cancelled: 0 } });
  });
});
