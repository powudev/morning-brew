import { describe, expect, it } from "vitest";
import { handleSlots } from "@/server/slots";
import { env, json, mockFetch, RPC_URL } from "@/server/test-helpers";

const now = new Date("2026-11-06T02:00:00Z");
const get = (query: string) => new Request(`https://brew.test/api/slots${query}`);

describe("handleSlots", () => {
  it("returns the day's slots with remaining seats, HH:MM times and no caching", async () => {
    const fetch = mockFetch({
      [RPC_URL("get_availability")]: () =>
        json([
          { slot_id: 1, start_time: "08:00:00", capacity: 12, remaining: 12 },
          { slot_id: 2, start_time: "10:00:00", capacity: 12, remaining: 0 },
        ]),
    });
    const res = await handleSlots(get("?date=2026-11-10"), env, fetch, now);
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(await res.json()).toEqual({
      date: "2026-11-10",
      slots: [
        { slotId: 1, startTime: "08:00", remaining: 12 },
        { slotId: 2, startTime: "10:00", remaining: 0 },
      ],
    });
    expect(JSON.parse(fetch.mock.calls[0][1]!.body as string)).toEqual({ p_date: "2026-11-10" });
  });

  it("marks slots already past today as 0 remaining", async () => {
    const fetch = mockFetch({
      [RPC_URL("get_availability")]: () =>
        json([
          { slot_id: 1, start_time: "08:00:00", capacity: 12, remaining: 12 },
          { slot_id: 2, start_time: "12:00:00", capacity: 12, remaining: 12 },
        ]),
    });
    const res = await handleSlots(get("?date=2026-11-06"), env, fetch, now);
    const data = (await res.json()) as { slots: { slotId: number; remaining: number }[] };
    expect(data.slots).toEqual([
      { slotId: 1, startTime: "08:00", remaining: 0 },
      { slotId: 2, startTime: "12:00", remaining: 12 },
    ]);
  });

  for (const [label, query] of [
    ["missing date", ""],
    ["malformed date", "?date=2026/11/10"],
    ["past date", "?date=2026-11-05"],
    ["more than 30 days ahead", "?date=2026-12-07"],
  ]) {
    it(`returns 400 for ${label} without querying the database`, async () => {
      const fetch = mockFetch({});
      const res = await handleSlots(get(query), env, fetch, now);
      expect(res.status).toBe(400);
      expect(fetch).not.toHaveBeenCalled();
    });
  }

  it("returns 503 on database errors without leaking details", async () => {
    const fetch = mockFetch({ [RPC_URL("get_availability")]: () => json({ message: "internal detail" }, 500) });
    const res = await handleSlots(get("?date=2026-11-10"), env, fetch, now);
    expect(res.status).toBe(503);
    expect(await res.text()).not.toContain("internal detail");
  });
});
