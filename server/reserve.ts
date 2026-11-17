import { fieldErrors, reservationSchema } from "@/lib/reservation-schema";
import { jsonResponse } from "@/server/http";
import { emailConfig, receivedEmail, sendEmail, type EmailEnv } from "@/server/email";
import { rpc, selectRows, type SupabaseEnv } from "@/server/supabase";
import { verifyTurnstile } from "@/server/turnstile";

export type ReserveEnv = SupabaseEnv & EmailEnv & { TURNSTILE_SECRET_KEY?: string };
/** Runs work after the response is sent (Pages `waitUntil`). */
export type Defer = (work: Promise<unknown>) => void;

const MAX_BODY_BYTES = 8 * 1024;

const businessErrors: Record<string, number> = {
  SLOT_FULL: 409,
  SLOT_NOT_AVAILABLE: 422,
  SLOT_IN_PAST: 422,
  INVALID_DATE: 422,
};

export async function handleReserve(
  request: Request,
  env: ReserveEnv,
  fetchImpl: typeof fetch = fetch,
  defer: Defer = (work) => void work,
): Promise<Response> {
  const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TURNSTILE_SECRET_KEY } = env;
  if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !TURNSTILE_SECRET_KEY) {
    console.error("reserve: missing environment variables");
    return jsonResponse({ error: "MISCONFIGURED" }, 500);
  }

  const contentType = (request.headers.get("Content-Type") ?? "").split(";")[0].trim().toLowerCase();
  if (contentType !== "application/json") return jsonResponse({ error: "UNSUPPORTED_MEDIA_TYPE" }, 415);

  if (Number(request.headers.get("Content-Length") ?? 0) > MAX_BODY_BYTES) {
    return jsonResponse({ error: "PAYLOAD_TOO_LARGE" }, 413);
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
    return jsonResponse({ error: "PAYLOAD_TOO_LARGE" }, 413);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    return jsonResponse({ error: "INVALID_JSON" }, 400);
  }

  const parsed = reservationSchema.safeParse(payload);
  if (!parsed.success) return jsonResponse({ error: "VALIDATION", fields: fieldErrors(parsed.error) }, 400);
  const input = parsed.data;

  try {
    // Fields are validated before Turnstile: a token can be verified only once.
    const human = await verifyTurnstile(
      TURNSTILE_SECRET_KEY,
      input.turnstileToken,
      request.headers.get("CF-Connecting-IP"),
      fetchImpl,
    );
    if (!human) return jsonResponse({ error: "TURNSTILE_FAILED" }, 403);
  } catch (err) {
    console.error("reserve: turnstile unavailable", err);
    return jsonResponse({ error: "TURNSTILE_UNAVAILABLE" }, 503);
  }

  let result;
  try {
    result = await rpc<string>(
      { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY },
      "create_reservation",
      {
        p_slot_id: input.slotId,
        p_date: input.date,
        p_name: input.name,
        p_email: input.email,
        p_party_size: input.partySize,
        p_phone: input.phone,
        p_note: input.note,
      },
      fetchImpl,
    );
  } catch (err) {
    console.error("reserve: database unavailable", err);
    return jsonResponse({ error: "DB_UNAVAILABLE" }, 503);
  }

  if (result.ok) {
    const config = emailConfig(env);
    if (config) {
      const db = { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY };
      defer(
        (async () => {
          const [slot] = await selectRows<{ start_time: string }>(
            db,
            "time_slots",
            `id=eq.${input.slotId}&select=start_time`,
            fetchImpl,
          );
          if (!slot) throw new Error("slot not found");
          const content = receivedEmail({
            name: input.name,
            date: input.date,
            startTime: slot.start_time.slice(0, 5),
            partySize: input.partySize,
          });
          await sendEmail(config, { ...content, to: input.email, idempotencyKey: `received/${result.data}` }, fetchImpl);
        })().catch((err: unknown) => console.error("reserve: received email failed", err)),
      );
    }
    return jsonResponse({ ok: true }, 201);
  }

  const status = result.code === "P0001" && result.message ? businessErrors[result.message] : undefined;
  if (status) return jsonResponse({ error: result.message }, status);
  if (result.code === "23514") return jsonResponse({ error: "VALIDATION", fields: {} }, 400);

  console.error("reserve: unexpected database error", result.status, result.code, result.message);
  return jsonResponse({ error: "INTERNAL" }, 500);
}
