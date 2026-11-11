import { describe, expect, it } from "vitest";
import { handleSlots } from "@/server/slots";
import { env, json, mockFetch, RPC_URL } from "@/server/test-helpers";

const now = new Date("2026-11-06T02:00:00Z");
const get = (query: string) => new Request(`https://brew.test/api/slots${query}`);

describe("handleSlots", () => {
  it("回傳該日時段與剩餘人數,時間格式為 HH:MM,且不快取", async () => {
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

  it("今天已經過去的時段標示為 0 名額", async () => {
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
    ["缺少 date", ""],
    ["格式錯誤", "?date=2026/11/10"],
    ["過去日期", "?date=2026-11-05"],
    ["超過 30 天", "?date=2026-12-07"],
  ]) {
    it(`${label} 回 400,不查資料庫`, async () => {
      const fetch = mockFetch({});
      const res = await handleSlots(get(query), env, fetch, now);
      expect(res.status).toBe(400);
      expect(fetch).not.toHaveBeenCalled();
    });
  }

  it("資料庫錯誤回 503,不洩漏內部訊息", async () => {
    const fetch = mockFetch({ [RPC_URL("get_availability")]: () => json({ message: "internal detail" }, 500) });
    const res = await handleSlots(get("?date=2026-11-10"), env, fetch, now);
    expect(res.status).toBe(503);
    expect(await res.text()).not.toContain("internal detail");
  });
});
