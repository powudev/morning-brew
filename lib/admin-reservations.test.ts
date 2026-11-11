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
  it("maps database rows to the frontend shape with HH:MM times", () => {
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

  it("reads the time when time_slots is an array (another PostgREST relation shape)", () => {
    expect(mapReservationRow({ ...row, time_slots: [{ start_time: "08:30:00" }] }).startTime).toBe("08:30");
  });

  it("treats unknown statuses as errors instead of showing them", () => {
    expect(() => mapReservationRow({ ...row, status: "hacked" })).toThrow();
  });
});

describe("sortReservations", () => {
  it("sorts by slot time, then by creation time", () => {
    const list = [
      r({ id: "c", startTime: "10:00", createdAt: "2099-03-01T02:00:00Z" }),
      r({ id: "a", startTime: "08:00", createdAt: "2099-03-01T03:00:00Z" }),
      r({ id: "b", startTime: "10:00", createdAt: "2099-03-01T01:00:00Z" }),
    ];
    expect(sortReservations(list).map((x) => x.id)).toEqual(["a", "b", "c"]);
  });

  it("does not mutate the input array", () => {
    const list = [r({ id: "b", startTime: "10:00" }), r({ id: "a", startTime: "08:00" })];
    sortReservations(list);
    expect(list.map((x) => x.id)).toEqual(["b", "a"]);
  });
});

describe("summarize", () => {
  it("counts per status; guest total excludes cancelled", () => {
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

  it("empty list", () => {
    expect(summarize([])).toEqual({ total: 0, guests: 0, byStatus: { pending: 0, confirmed: 0, cancelled: 0 } });
  });
});
