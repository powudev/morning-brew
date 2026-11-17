import { z } from "zod";
import { confirmedEmail, emailConfig, sendEmail, type EmailEnv } from "@/server/email";
import { jsonResponse } from "@/server/http";
import { getUserId, patchRows, selectRows, type SupabaseEnv } from "@/server/supabase";

export type NotifyEnv = SupabaseEnv & EmailEnv;

z.config({ jitless: true }); // CSP-safe, same as lib/reservation-schema.ts
const bodySchema = z.object({ id: z.guid() });
const MAX_BODY_BYTES = 1024;

type SlotRef = { start_time: string };
type Claimed = {
  name: string;
  email: string;
  reservation_date: string;
  party_size: number;
  time_slots: SlotRef | SlotRef[] | null;
};

/**
 * Sends the "reservation confirmed" email. Called by the staff dashboard right after it confirms a booking.
 * The caller must be signed-in staff; each reservation is emailed at most once (confirmed_email_sent_at).
 */
export async function handleNotifyConfirmed(
  request: Request,
  env: NotifyEnv,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = env;
  if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("notify-confirmed: missing environment variables");
    return jsonResponse({ error: "MISCONFIGURED" }, 500);
  }
  const db = { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY };

  const contentType = (request.headers.get("Content-Type") ?? "").split(";")[0].trim().toLowerCase();
  if (contentType !== "application/json") return jsonResponse({ error: "UNSUPPORTED_MEDIA_TYPE" }, 415);
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) return jsonResponse({ error: "PAYLOAD_TOO_LARGE" }, 413);
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    return jsonResponse({ error: "INVALID_JSON" }, 400);
  }
  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) return jsonResponse({ error: "VALIDATION" }, 400);
  const { id } = parsed.data;

  const token = /^Bearer (\S+)$/.exec(request.headers.get("Authorization") ?? "")?.[1];
  if (!token) return jsonResponse({ error: "UNAUTHORIZED" }, 401);
  // Email off: answer before touching Supabase, so confirming works the same as before email existed.
  const config = emailConfig(env);
  if (!config) return jsonResponse({ sent: false, reason: "EMAIL_DISABLED" }, 200);

  let claimed: Claimed | undefined;
  try {
    const userId = await getUserId(db, token, fetchImpl);
    if (!userId) return jsonResponse({ error: "UNAUTHORIZED" }, 401);
    const staff = await selectRows(db, "staff", `user_id=eq.${encodeURIComponent(userId)}&select=user_id`, fetchImpl);
    if (staff.length === 0) return jsonResponse({ error: "FORBIDDEN" }, 403);

    // Claim in one statement: only a confirmed reservation that hasn't been emailed matches.
    [claimed] = await patchRows<Claimed>(
      db,
      "reservations",
      `id=eq.${id}&status=eq.confirmed&confirmed_email_sent_at=is.null` +
        "&select=name,email,reservation_date,party_size,time_slots(start_time)",
      { confirmed_email_sent_at: new Date().toISOString() },
      fetchImpl,
    );
  } catch (err) {
    console.error("notify-confirmed: database unavailable", err);
    return jsonResponse({ error: "DB_UNAVAILABLE" }, 503);
  }
  if (!claimed) return jsonResponse({ sent: false, reason: "NOTHING_TO_SEND" }, 200);

  const slot = Array.isArray(claimed.time_slots) ? claimed.time_slots[0] : claimed.time_slots;
  try {
    const content = confirmedEmail({
      name: claimed.name,
      date: claimed.reservation_date,
      startTime: (slot?.start_time ?? "").slice(0, 5),
      partySize: claimed.party_size,
    });
    await sendEmail(config, { ...content, to: claimed.email, idempotencyKey: `confirmed/${id}` }, fetchImpl);
  } catch (err) {
    console.error("notify-confirmed: email failed", err);
    // Release the claim so confirming again can retry.
    await patchRows(db, "reservations", `id=eq.${id}`, { confirmed_email_sent_at: null }, fetchImpl).catch((e: unknown) =>
      console.error("notify-confirmed: could not release claim", e),
    );
    return jsonResponse({ error: "EMAIL_FAILED" }, 502);
  }
  return jsonResponse({ sent: true }, 200);
}
