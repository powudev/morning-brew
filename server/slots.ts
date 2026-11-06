import { bookingWindow, isIsoDate, nowTimeInTaipei, todayInTaipei } from "@/lib/dates";
import { jsonResponse } from "@/server/http";
import { rpc, type SupabaseEnv } from "@/server/supabase";

type AvailabilityRow = { slot_id: number; start_time: string; capacity: number; remaining: number };
export type SlotAvailability = { slotId: number; startTime: string; remaining: number };

/** GET /api/slots?date=YYYY-MM-DD:某日各時段剩餘人數(anon 不能直接查 DB,經這裡以 service role 讀取) */
export async function handleSlots(
  request: Request,
  env: SupabaseEnv,
  fetchImpl: typeof fetch = fetch,
  now: Date = new Date(),
): Promise<Response> {
  const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = env;
  if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("slots: missing environment variables");
    return jsonResponse({ error: "MISCONFIGURED" }, 500);
  }

  const date = new URL(request.url).searchParams.get("date") ?? "";
  const { min, max } = bookingWindow(now);
  if (!isIsoDate(date) || date < min || date > max) return jsonResponse({ error: "INVALID_DATE" }, 400);

  let result;
  try {
    result = await rpc<AvailabilityRow[]>(
      { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY },
      "get_availability",
      { p_date: date },
      fetchImpl,
    );
  } catch (err) {
    console.error("slots: database unavailable", err);
    return jsonResponse({ error: "DB_UNAVAILABLE" }, 503);
  }
  if (!result.ok) {
    console.error("slots: database error", result.status, result.code, result.message);
    return jsonResponse({ error: "DB_UNAVAILABLE" }, 503);
  }

  // 今天已經開始的時段不能訂(與 create_reservation() 的 SLOT_IN_PAST 一致)
  const isToday = date === todayInTaipei(now);
  const nowTime = nowTimeInTaipei(now);
  const slots: SlotAvailability[] = result.data.map((row) => {
    const startTime = row.start_time.slice(0, 5);
    return {
      slotId: row.slot_id,
      startTime,
      remaining: isToday && startTime <= nowTime ? 0 : Math.max(0, row.remaining),
    };
  });
  return jsonResponse({ date, slots }, 200);
}
